import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as d3 from 'd3';
import { updateMemberPosition } from '../api';
import { useLanguage } from '../context/LanguageContext';

const SECTION_W = 180;
const CARD_H = 72;
const PHOTO_W = 60;   // 1/3 of card width for profile picture
const INFO_W = 120;   // 2/3 of card width for text info
const V_GAP = 50;
const H_GAP = 14;
const COUPLE_GAP = 0;

const FILTERS = { ALL: 'all', LIVING: 'living', DECEASED: 'deceased', DIVORCED: 'divorced' };
const VIEWS = { TREE: 'tree', BRANCH: 'branch' }; // TREE = top-down, BRANCH = left-to-right
const D3_LAYOUTS = { TIDY: 'tidy' }; // Only tidy layout used now

function FamilyTreeCanvas({ members, treeId, treeRootId, onSelectMember, onAddChild, isAdmin = false, viewMode, onViewModeChange, userLinkedMemberId }) {
  const { t } = useLanguage();
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const zoomRef = useRef(null);
  const gRef = useRef(null);
  const onSelectMemberRef = useRef(onSelectMember);
  const onAddChildRef = useRef(onAddChild);
  const [activeFilter, setActiveFilter] = useState(FILTERS.ALL);
  const [viewRootId, setViewRootId] = useState(null);
  // Use prop viewMode if provided, otherwise use local state
  const [localViewMode, setLocalViewMode] = useState(viewMode || VIEWS.TREE);
  const effectiveViewMode = viewMode !== undefined ? viewMode : localViewMode;
  const [d3Layout, setD3Layout] = useState(D3_LAYOUTS.TIDY);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [focusedMemberId, setFocusedMemberId] = useState(null); // For generation navigation
  const childLinkElemsRef = useRef({});

  onSelectMemberRef.current = onSelectMember;
  onAddChildRef.current = onAddChild;

  // Initialize viewRootId with userLinkedMemberId for member users
  useEffect(() => {
    if (userLinkedMemberId && members && members.length > 0) {
      const linkedMember = members.find(m => m._id === userLinkedMemberId);
      if (linkedMember) {
        setViewRootId(userLinkedMemberId);
      }
    }
  }, [userLinkedMemberId, members]);

  const rid = (ref) => (ref && typeof ref === 'object' ? ref._id : ref);

  const getLookup = useCallback(() => {
    const m = {};
    (members || []).forEach((x) => { m[x._id] = x; });
    return m;
  }, [members]);

  const findCouples = useCallback((lookup) => {
    const couples = new Map();
    Object.values(lookup).forEach((m) => {
      (m.spouses || []).forEach((sp) => {
        const sid = rid(sp.memberId);
        if (!sid) return;
        const key = [m._id, sid].sort().join('-');
        if (!couples.has(key)) {
          couples.set(key, { a: m._id, b: sid, status: sp.status || 'married' });
        }
      });
    });
    return couples;
  }, []);

  const findDefaultRoot = useCallback(() => {
    if (!members || members.length === 0) return null;
    if (treeRootId) {
      const rootRef = typeof treeRootId === 'object' ? treeRootId._id : treeRootId;
      if (rootRef && members.some((m) => m._id === rootRef)) return rootRef;
    }
    for (const m of members) {
      if (!rid(m.fatherId) && !rid(m.motherId)) return m._id;
    }
    return members[0]._id;
  }, [members, treeRootId]);

  // Find all root members (members without parents)
  const findAllRoots = useCallback(() => {
    if (!members || members.length === 0) return [];
    const roots = [];
    const hasParentLink = new Set();

    // First, find all members that are children of someone
    members.forEach((m) => {
      (m.childrenIds || []).forEach((cRef) => {
        const cId = rid(cRef);
        if (cId) hasParentLink.add(cId);
      });
    });

    // Also check fatherId/motherId
    members.forEach((m) => {
      if (rid(m.fatherId) || rid(m.motherId)) {
        hasParentLink.add(m._id);
      }
    });

    // Find members without parent links
    members.forEach((m) => {
      if (!hasParentLink.has(m._id)) {
        roots.push(m._id);
      }
    });

    // If no roots found, use the first member
    if (roots.length === 0 && members.length > 0) {
      roots.push(members[0]._id);
    }

    return roots;
  }, [members]);

  // Build hierarchy with multiple roots for admin view (shows all members)
  const buildMultiRootHierarchy = useCallback(() => {
    if (!members || members.length === 0) return null;

    const lookup = {};
    members.forEach((m) => { lookup[m._id] = { ...m, children: [] }; });

    // Find all root members (no parents)
    const roots = findAllRoots();
    if (roots.length === 0) return null;
    const rootSet = new Set(roots);

    // Build parent-child relationships
    // Priority: attach to parent who is NOT a root (has ancestors) to maintain generation levels
    const attached = new Set();

    members.forEach((m) => {
      const fId = rid(m.fatherId);
      const mId = rid(m.motherId);

      if (!fId && !mId) return; // No parents, skip

      // Determine which parent to attach to based on hierarchy depth
      // Prefer the parent who is NOT a root (has parents themselves)
      let attachToId = null;

      if (fId && mId && lookup[fId] && lookup[mId]) {
        // Both parents exist - prefer the one with parents (not a root)
        const fatherIsRoot = rootSet.has(fId);
        const motherIsRoot = rootSet.has(mId);

        if (!fatherIsRoot && motherIsRoot) {
          attachToId = fId; // Father has parents, attach to father
        } else if (fatherIsRoot && !motherIsRoot) {
          attachToId = mId; // Mother has parents, attach to mother
        } else {
          // Both are roots or both have parents - prefer father
          attachToId = fId;
        }
      } else if (fId && lookup[fId]) {
        attachToId = fId;
      } else if (mId && lookup[mId]) {
        attachToId = mId;
      }

      if (attachToId && !attached.has(m._id)) {
        lookup[attachToId].children.push(lookup[m._id]);
        attached.add(m._id);
      }
    });

    // Sort children by birthDate
    Object.values(lookup).forEach((node) => {
      if (node.children.length > 1) {
        node.children.sort((a, b) => {
          const aD = a.birthDate ? new Date(a.birthDate).getTime() : Infinity;
          const bD = b.birthDate ? new Date(b.birthDate).getTime() : Infinity;
          return aD - bD;
        });
      }
    });

    // If only one root, return it directly
    if (roots.length === 1) {
      return lookup[roots[0]];
    }

    // Create a virtual super-root to hold multiple root trees
    const superRoot = {
      _id: '__super_root__',
      firstName: '',
      lastName: '',
      isVirtualRoot: true,
      children: roots.map((rId) => lookup[rId]).filter(Boolean),
    };

    return superRoot;
  }, [members, findAllRoots]);

  const buildHierarchy = useCallback((rootId) => {
    if (!members || members.length === 0) return null;
    const lookup = {};
    members.forEach((m) => { lookup[m._id] = { ...m, children: [] }; });
    const effectiveRoot = rootId && lookup[rootId] ? rootId : findDefaultRoot();
    if (!effectiveRoot) return null;

    // Build a set of all IDs reachable from the root via bloodline + spouse links
    const reachable = new Set();
    const queue = [effectiveRoot];
    reachable.add(effectiveRoot);
    while (queue.length > 0) {
      const cur = queue.shift();
      const m = lookup[cur];
      if (!m) continue;
      // Reach spouses
      (m.spouses || []).forEach((sp) => {
        const sid = rid(sp.memberId);
        if (sid && lookup[sid] && !reachable.has(sid)) {
          reachable.add(sid);
          queue.push(sid);
        }
      });
      // Reach children (both via fatherId/motherId back-link and childrenIds)
      (m.childrenIds || []).forEach((cRef) => {
        const cId = rid(cRef);
        if (cId && lookup[cId] && !reachable.has(cId)) {
          reachable.add(cId);
          queue.push(cId);
        }
      });
    }

    const isBloodline = (id) => {
      if (id === effectiveRoot) return true;
      const m = lookup[id];
      if (!m) return false;
      const fId = rid(m.fatherId);
      const mId = rid(m.motherId);
      return !!((fId && reachable.has(fId)) || (mId && reachable.has(mId)));
    };

    // Check if a member is reachable in the hierarchy (has a path from root
    // through parent-child chain, not just through spouse links)
    const inHierarchy = (id) => {
      if (id === effectiveRoot) return true;
      // A member is "in hierarchy" if it's bloodline OR is a spouse of someone bloodline
      if (isBloodline(id)) return true;
      const m = lookup[id];
      if (!m) return false;
      return (m.spouses || []).some((sp) => {
        const sid = rid(sp.memberId);
        return sid && isBloodline(sid);
      });
    };

    members.forEach((m) => {
      const fId = rid(m.fatherId);
      const mId = rid(m.motherId);
      if (!fId && !mId) return;

      // Skip members whose parents are both outside the current tree
      // (e.g. Elizabeth has Park-side parents not reachable from Nguyen root)
      const fReachable = fId && reachable.has(fId);
      const mReachable = mId && reachable.has(mId);
      if (!fReachable && !mReachable) return;

      const father = fId ? lookup[fId] : null;
      const mother = mId ? lookup[mId] : null;
      let primary = null;
      if (father && mother) {
        const fBlood = isBloodline(fId);
        const mBlood = isBloodline(mId);
        if (fBlood && !mBlood) primary = father;
        else if (mBlood && !fBlood) primary = mother;
        else if (fBlood && mBlood) primary = father;
        else {
          // Neither parent is bloodline. Find the one that is inHierarchy
          // (married-in spouse of a bloodline member) and redirect the child
          // to the bloodline spouse so it appears in the D3 tree.
          // Only redirect through non-divorced spouse links to avoid
          // attaching children to an ex-spouse's subtree.
          const fInH = inHierarchy(fId);
          const mInH = inHierarchy(mId);
          const inHParentId = fInH ? fId : mInH ? mId : null;
          if (inHParentId) {
            const inHMem = lookup[inHParentId];
            let bloodlineSpouse = null;
            (inHMem.spouses || []).forEach((sp) => {
              const sid = rid(sp.memberId);
              if (sid && isBloodline(sid) && !bloodlineSpouse && sp.status !== 'divorced') {
                bloodlineSpouse = lookup[sid];
              }
            });
            // Fallback: if no non-divorced bloodline spouse found,
            // try divorced ones so child still connects to the tree
            if (!bloodlineSpouse) {
              (inHMem.spouses || []).forEach((sp) => {
                const sid = rid(sp.memberId);
                if (sid && isBloodline(sid) && !bloodlineSpouse) {
                  bloodlineSpouse = lookup[sid];
                }
              });
            }
            primary = bloodlineSpouse || (fInH ? father : mother);
          } else {
            primary = father;
          }
        }
      } else {
        primary = father || mother;
      }
      if (primary && !primary.children.find((c) => c._id === m._id)) {
        primary.children.push(lookup[m._id]);
      }
    });

    members.forEach((parent) => {
      const pNode = lookup[parent._id];
      if (!pNode) return;
      if (!reachable.has(parent._id)) return;
      (parent.childrenIds || []).forEach((cRef) => {
        const cId = rid(cRef);
        if (!cId || !lookup[cId]) return;
        const alreadyAttached = members.some((p2) => {
          const p2Node = lookup[p2._id];
          return p2Node && p2Node.children.some((c) => c._id === cId);
        });
        if (!alreadyAttached) {
          pNode.children.push(lookup[cId]);
        }
      });
    });

    // Sort children: group by actual parent couple, sort by birthDate within
    // each group, then chain groups so those sharing a parent are adjacent.
    Object.values(lookup).forEach((node) => {
      if (node.children.length > 1) {
        const coupleGroups = {};
        node.children.forEach((child) => {
          const fId = rid(child.fatherId) || '_none';
          const mId = rid(child.motherId) || '_none';
          const key = [fId, mId].sort().join('|');
          if (!coupleGroups[key]) coupleGroups[key] = { fId, mId, children: [] };
          coupleGroups[key].children.push(child);
        });
        Object.values(coupleGroups).forEach((grp) => {
          grp.children.sort((a, b) => {
            const aD = a.birthDate ? new Date(a.birthDate).getTime() : Infinity;
            const bD = b.birthDate ? new Date(b.birthDate).getTime() : Infinity;
            return aD - bD;
          });
        });
        // Chain groups by shared-parent adjacency
        const keys = Object.keys(coupleGroups);
        keys.sort((ka, kb) => {
          const aD = coupleGroups[ka].children[0].birthDate ? new Date(coupleGroups[ka].children[0].birthDate).getTime() : Infinity;
          const bD = coupleGroups[kb].children[0].birthDate ? new Date(coupleGroups[kb].children[0].birthDate).getTime() : Infinity;
          return aD - bD;
        });
        const sharesParent = (ka, kb) => {
          const a = coupleGroups[ka], b = coupleGroups[kb];
          return (a.fId !== '_none' && (a.fId === b.fId || a.fId === b.mId)) ||
                 (a.mId !== '_none' && (a.mId === b.fId || a.mId === b.mId));
        };
        const chain = [keys[0]];
        const used = new Set([keys[0]]);
        while (chain.length < keys.length) {
          const last = chain[chain.length - 1];
          let next = null;
          for (const k of keys) {
            if (!used.has(k) && sharesParent(last, k)) { next = k; break; }
          }
          if (!next) {
            for (const k of keys) { if (!used.has(k)) { next = k; break; } }
          }
          chain.push(next);
          used.add(next);
        }
        const sorted = [];
        chain.forEach((k) => sorted.push(...coupleGroups[k].children));
        node.children = sorted;
      }
    });

    return lookup[effectiveRoot] || null;
  }, [members, findDefaultRoot]);

  function resetRoot() { setViewRootId(null); }

  const fitToScreen = useCallback(() => {
    const svg = d3.select(svgRef.current);
    const gNode = gRef.current;
    const container = containerRef.current;
    const zoomBehavior = zoomRef.current;
    if (!gNode || !container || !zoomBehavior) return;
    const bbox = gNode.getBBox();
    if (bbox.width === 0 || bbox.height === 0) return;
    const padding = 40;
    const w = container.clientWidth;
    const h = container.clientHeight;
    const scale = Math.min(
      (w - padding * 2) / bbox.width,
      (h - padding * 2) / bbox.height,
      1.5
    );
    const tx = w / 2 - (bbox.x + bbox.width / 2) * scale;
    const ty = h / 2 - (bbox.y + bbox.height / 2) * scale;
    svg.transition().duration(400).call(
      zoomBehavior.transform,
      d3.zoomIdentity.translate(tx, ty).scale(scale)
    );
  }, []);

  // ────────────────────────── RENDER ──────────────────────────
  useEffect(() => {
    if (!members || members.length === 0) return;

    const isBranch = effectiveViewMode === VIEWS.BRANCH;
    // Spouse step: 0-gap between cards (edge-to-edge touching)
    const spouseStep = isBranch ? CARD_H : SECTION_W;

    // For admin, always use multi-root hierarchy to show all members
    // For non-admin with viewRootId set, show that specific branch
    // For non-admin with viewRootId null (reset), show full tree
    let root;
    if (isAdmin || !viewRootId) {
      root = buildMultiRootHierarchy();
    } else {
      root = buildHierarchy(viewRootId);
    }
    if (!root) return;

    const lookup = getLookup();
    const couples = findCouples(lookup);
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    svg.attr('width', width).attr('height', height);

    const g = svg.append('g');
    gRef.current = g.node();
    const zoomBehavior = d3.zoom().scaleExtent([0.08, 3]).on('zoom', (e) => g.attr('transform', e.transform));
    zoomRef.current = zoomBehavior;
    svg.call(zoomBehavior);

    // ══════════════════════════════════════════════════════
    // SPECIAL LAYOUTS: radial, tree-of-life, indented
    // ══════════════════════════════════════════════════════
    const isRadialType = d3Layout === D3_LAYOUTS.RADIAL || d3Layout === D3_LAYOUTS.TREE_OF_LIFE;
    const isIndented = d3Layout === D3_LAYOUTS.INDENTED;

    if (isRadialType || isIndented) {
      const hierarchy = d3.hierarchy(root, (d) => d.children);
      const nodeColor = (d) => {
        if (!d.data.isLiving) return '#90a4ae';
        if (d.data.gender === 'male') return '#1976d2';
        if (d.data.gender === 'female') return '#c2185b';
        return '#9e9e9e';
      };
      const nodeFill = (d) => {
        if (!d.data.isLiving) return '#eceff1';
        if (d.data.gender === 'male') return '#e3f2fd';
        if (d.data.gender === 'female') return '#fce4ec';
        return '#f5f5f5';
      };

      if (isRadialType) {
        // ── Radial Tidy Tree / Tree of Life ──────────────
        const nodeCount = hierarchy.descendants().length;
        const radius = Math.max(nodeCount * 14, 280);
        const layoutFn = d3Layout === D3_LAYOUTS.TREE_OF_LIFE ? d3.cluster() : d3.tree();
        layoutFn.size([2 * Math.PI, radius])
          .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth);
        layoutFn(hierarchy);

        g.attr('transform', `translate(${width / 2}, ${height / 2})`);

        const linkGen = d3Layout === D3_LAYOUTS.TREE_OF_LIFE
          ? (d) => {
              const sa = d.source.x - Math.PI / 2;
              const ta = d.target.x - Math.PI / 2;
              const sr = d.source.y;
              const tr = d.target.y;
              return `M${sr * Math.cos(sa)},${sr * Math.sin(sa)}`
                + `A${sr},${sr} 0 0 ${d.target.x > d.source.x ? 1 : 0} ${sr * Math.cos(ta)},${sr * Math.sin(ta)}`
                + `L${tr * Math.cos(ta)},${tr * Math.sin(ta)}`;
            }
          : d3.linkRadial().angle((d) => d.x).radius((d) => d.y);

        g.selectAll('.radial-link')
          .data(hierarchy.links())
          .join('path')
          .attr('class', 'radial-link')
          .attr('fill', 'none')
          .attr('stroke', '#b0bec5')
          .attr('stroke-width', 1.4)
          .attr('stroke-opacity', 0.6)
          .attr('d', linkGen);

        const node = g.selectAll('.radial-node')
          .data(hierarchy.descendants())
          .join('g')
          .attr('class', 'tree-node radial-node')
          .attr('transform', (d) => {
            const angle = d.x - Math.PI / 2;
            return `translate(${d.y * Math.cos(angle)},${d.y * Math.sin(angle)})`;
          })
          .style('cursor', 'pointer')
          .on('click', (e, d) => { e.stopPropagation(); if (onSelectMemberRef.current) onSelectMemberRef.current(d.data); });

        node.append('circle')
          .attr('r', (d) => d.children ? 5 : 4)
          .attr('fill', nodeFill)
          .attr('stroke', nodeColor)
          .attr('stroke-width', 1.5);

        node.append('text')
          .attr('dy', '0.31em')
          .attr('x', (d) => (d.x < Math.PI === !d.children) ? 8 : -8)
          .attr('text-anchor', (d) => (d.x < Math.PI === !d.children) ? 'start' : 'end')
          .attr('transform', (d) => d.x >= Math.PI ? 'rotate(180)' : null)
          .attr('font-size', '11px')
          .attr('fill', '#424242')
          .text((d) => {
            const parts = [d.data.lastName, d.data.middleName, d.data.vnName, d.data.firstName].filter(Boolean);
            return parts.join(' ');
          });

        node.filter((d) => !d.data.isLiving)
          .append('text')
          .attr('dy', '-0.8em')
          .attr('text-anchor', 'middle')
          .attr('font-size', '9px')
          .text('✝');

      } else {
        // ── Indented Tree ──────────────────────────────────
        const ROW_H = 30;
        const INDENT = 28;
        const BAR_W = 160;
        const BAR_H = 22;
        let idx = -1;
        hierarchy.eachBefore((d) => { d.index = ++idx; });

        g.selectAll('.indent-link')
          .data(hierarchy.links())
          .join('path')
          .attr('class', 'indent-link')
          .attr('fill', 'none')
          .attr('stroke', '#cfd8dc')
          .attr('stroke-width', 1.2)
          .attr('d', (d) => {
            const sx = d.source.depth * INDENT + 4;
            const sy = d.source.index * ROW_H + BAR_H / 2;
            const tx = d.target.depth * INDENT;
            const ty = d.target.index * ROW_H + BAR_H / 2;
            return `M${sx},${sy} V${ty} H${tx}`;
          });

        const node = g.selectAll('.indent-node')
          .data(hierarchy.descendants())
          .join('g')
          .attr('class', 'tree-node indent-node')
          .attr('transform', (d) => `translate(${d.depth * INDENT}, ${d.index * ROW_H})`)
          .style('cursor', 'pointer')
          .on('click', (e, d) => { e.stopPropagation(); if (onSelectMemberRef.current) onSelectMemberRef.current(d.data); });

        node.append('rect')
          .attr('width', BAR_W).attr('height', BAR_H).attr('rx', 4)
          .attr('fill', nodeFill)
          .attr('stroke', nodeColor)
          .attr('stroke-width', 1.2);

        node.append('text')
          .attr('x', 8).attr('y', BAR_H / 2 + 1)
          .attr('dominant-baseline', 'middle')
          .attr('font-size', '11px')
          .attr('fill', '#212121')
          .text((d) => {
            const em = d.data.gender === 'male' ? '👨' : d.data.gender === 'female' ? '👩' : '🧑';
            const life = d.data.isLiving ? '' : ' ✝';
            const parts = [d.data.lastName, d.data.middleName, d.data.vnName, d.data.firstName].filter(Boolean);
            return `${em} ${parts.join(' ')}${life}`;
          });

        node.filter((d) => d.children && d.children.length > 0)
          .append('text')
          .attr('x', BAR_W + 4).attr('y', BAR_H / 2 + 1)
          .attr('dominant-baseline', 'middle')
          .attr('font-size', '9px')
          .attr('fill', '#78909c')
          .text((d) => `(${d.children.length})`);
      }

      svg.on('click', () => { /* clear selection */ });

      requestAnimationFrame(() => {
        const bbox = g.node().getBBox();
        if (bbox.width === 0 || bbox.height === 0) return;
        const pad = 40;
        const sc = Math.min((width - pad * 2) / bbox.width, (height - pad * 2) / bbox.height, 1.5);
        const tx = width / 2 - (bbox.x + bbox.width / 2) * sc;
        const ty = height / 2 - (bbox.y + bbox.height / 2) * sc;
        svg.call(zoomBehavior.transform, d3.zoomIdentity.translate(tx, ty).scale(sc));
      });

      return;
    }

    // Build set of IDs that are in the D3 hierarchy (have tree positions)
    const hierarchyIds = new Set();
    const hQueue = [root];
    while (hQueue.length) {
      const n = hQueue.shift();
      // Skip virtual super root
      if (n._id !== '__super_root__') {
        hierarchyIds.add(n._id);
      }
      (n.children || []).forEach((c) => hQueue.push(c));
    }

    // Get effective root ID (for single root mode, null for multi-root)
    const effectiveRootId = root.isVirtualRoot ? null : root._id;

    const isBloodline = (id) => {
      if (effectiveRootId && id === effectiveRootId) return true;
      return hierarchyIds.has(id);
    };

    // ══════════════════════════════════════════════════════
    // BUILD SPOUSE GROUPS
    // ══════════════════════════════════════════════════════
    const spouseAdj = {};
    members.forEach((m) => { spouseAdj[m._id] = []; });

    const divorcedList = [];
    couples.forEach((c, key) => {
      if (c.status === 'divorced') {
        divorcedList.push({ ...c, key });
        return;
      }
      if (!spouseAdj[c.a]) spouseAdj[c.a] = [];
      if (!spouseAdj[c.b]) spouseAdj[c.b] = [];
      spouseAdj[c.a].push(c.b);
      spouseAdj[c.b].push(c.a);
    });

    const visited = new Set();
    const memberToGroup = {};
    const groups = new Map();

    members.forEach((m) => {
      if (visited.has(m._id)) return;
      if (!spouseAdj[m._id] || spouseAdj[m._id].length === 0) {
        visited.add(m._id);
        return;
      }

      const queue = [m._id];
      const component = [];
      visited.add(m._id);
      while (queue.length > 0) {
        const curr = queue.shift();
        component.push(curr);
        (spouseAdj[curr] || []).forEach((nb) => {
          if (!visited.has(nb)) {
            visited.add(nb);
            queue.push(nb);
          }
        });
      }
      if (component.length < 2) return;

      const bloodId = component.find((id) => isBloodline(id)) || component[0];

      // BFS from a chain-end (member with only 1 spouse link in this component)
      // to ensure correct adjacency (e.g., Robert-Elizabeth-George, not Elizabeth-Robert-George).
      // Among chain-ends, pick the oldest (earliest birthDate) for consistent ordering.
      const compSet = new Set(component);
      const chainEnds = component.filter((id) => {
        const adj = (spouseAdj[id] || []).filter((nb) => compSet.has(nb));
        return adj.length <= 1;
      });
      let chainStart = chainEnds[0] || component[0];
      if (chainEnds.length > 1) {
        chainEnds.sort((a, b) => {
          const aD = lookup[a]?.birthDate ? new Date(lookup[a].birthDate).getTime() : Infinity;
          const bD = lookup[b]?.birthDate ? new Date(lookup[b].birthDate).getTime() : Infinity;
          return aD - bD;
        });
        chainStart = chainEnds[0];
      }

      const ordered = [];
      const oVisited = new Set();
      const oQueue = [chainStart];
      oVisited.add(chainStart);
      while (oQueue.length > 0) {
        const curr = oQueue.shift();
        ordered.push(curr);
        (spouseAdj[curr] || []).forEach((nb) => {
          if (!oVisited.has(nb) && component.includes(nb)) {
            oVisited.add(nb);
            oQueue.push(nb);
          }
        });
      }

      const groupKey = ordered.join('-');
      const primaryIdx = ordered.indexOf(bloodId);
      groups.set(groupKey, {
        memberIds: ordered,
        primaryId: bloodId,
        primaryIndex: primaryIdx,
        size: ordered.length,
      });
      ordered.forEach((id) => { memberToGroup[id] = groupKey; });
    });

    // ── Reorder groups so divorced members face their ex-spouse ─
    // Step 4 places the missing ex-spouse's group to the RIGHT (tree) / BOTTOM (branch)
    // of the positioned group. So:
    //   - The positioned divorced member → LAST position (right/bottom edge)
    //   - The missing divorced member → FIRST position (left/top edge)
    divorcedList.forEach((dc) => {
      const aBlood = isBloodline(dc.a);
      const bBlood = isBloodline(dc.b);
      const posId = aBlood ? dc.a : bBlood ? dc.b : dc.a;
      const missId = posId === dc.a ? dc.b : dc.a;

      // Move positioned divorced member to LAST position in their group
      const posGKey = memberToGroup[posId];
      if (posGKey) {
        const grp = groups.get(posGKey);
        if (grp && grp.size > 1) {
          const idx = grp.memberIds.indexOf(posId);
          if (idx !== grp.size - 1) {
            grp.memberIds.splice(idx, 1);
            grp.memberIds.push(posId);
            grp.primaryIndex = grp.memberIds.indexOf(grp.primaryId);
          }
        }
      }

      // Move missing divorced member to FIRST position in their group
      const missGKey = memberToGroup[missId];
      if (missGKey) {
        const grp = groups.get(missGKey);
        if (grp && grp.size > 1) {
          const idx = grp.memberIds.indexOf(missId);
          if (idx !== 0) {
            grp.memberIds.splice(idx, 1);
            grp.memberIds.unshift(missId);
            grp.primaryIndex = grp.memberIds.indexOf(grp.primaryId);
          }
        }
      }
    });

    // ── Re-sort children by shared-parent adjacency ──
    // Priority 1: children with same father AND mother stay together
    // Priority 2: groups sharing either father or mother are placed adjacent
    const resortByParentPosition = (node) => {
      if (!node || !node.children || node.children.length <= 1) return;
      node.children.forEach((c) => resortByParentPosition(c));

      const nodeGKey = memberToGroup[node._id];
      const nodeGrp = nodeGKey ? groups.get(nodeGKey) : null;
      if (!nodeGrp || nodeGrp.size < 2) return;

      // Build position index for each member in the group
      const posIndex = {};
      nodeGrp.memberIds.forEach((mid, i) => { posIndex[mid] = i; });

      // Also assign indices for divorced ex-spouses (beyond group edge)
      let divOffset = nodeGrp.size;
      divorcedList.forEach((dc) => {
        const inGrp = posIndex[dc.a] !== undefined ? dc.a : posIndex[dc.b] !== undefined ? dc.b : null;
        const outId = inGrp === dc.a ? dc.b : dc.a;
        if (inGrp && posIndex[outId] === undefined) {
          posIndex[outId] = divOffset++;
        }
      });

      // Compute couple position (average of parent indices in the spouse group)
      const couplePos = (grp) => {
        const fIdx = grp.fId && posIndex[grp.fId] !== undefined ? posIndex[grp.fId] : -1;
        const mIdx = grp.mId && posIndex[grp.mId] !== undefined ? posIndex[grp.mId] : -1;
        if (fIdx >= 0 && mIdx >= 0) return (fIdx + mIdx) / 2;
        if (fIdx >= 0) return fIdx;
        if (mIdx >= 0) return mIdx;
        return 0;
      };

      // Group children by couple key
      const coupleChildren = {};
      node.children.forEach((child) => {
        const fId = rid(child.fatherId) || null;
        const mId = rid(child.motherId) || null;
        const key = [fId || '_none', mId || '_none'].sort().join('|');
        if (!coupleChildren[key]) coupleChildren[key] = { fId, mId, children: [] };
        coupleChildren[key].children.push(child);
      });

      const keys = Object.keys(coupleChildren);
      if (keys.length <= 1) return;

      // Sort keys initially by couple position in spouse group
      keys.sort((a, b) => couplePos(coupleChildren[a]) - couplePos(coupleChildren[b]));

      // Chain groups: start with lowest couple position, then greedily
      // pick the next unvisited group that shares a parent (same father or mother)
      const sharesParent = (ka, kb) => {
        const a = coupleChildren[ka], b = coupleChildren[kb];
        return (a.fId && (a.fId === b.fId || a.fId === b.mId)) ||
               (a.mId && (a.mId === b.fId || a.mId === b.mId));
      };

      const chain = [keys[0]];
      const used = new Set([keys[0]]);
      while (chain.length < keys.length) {
        const last = chain[chain.length - 1];
        let next = null;
        for (const k of keys) {
          if (!used.has(k) && sharesParent(last, k)) { next = k; break; }
        }
        if (!next) {
          for (const k of keys) { if (!used.has(k)) { next = k; break; } }
        }
        chain.push(next);
        used.add(next);
      }

      const resorted = [];
      chain.forEach((k) => resorted.push(...coupleChildren[k].children));
      node.children = resorted;
    };
    resortByParentPosition(root);

    // ── Compute effective width for each tree node ─────
    const getGroupSize = (nodeId) => {
      const gKey = memberToGroup[nodeId];
      if (!gKey) return 1;
      return groups.get(gKey).size;
    };

    const getDivorcedCount = (nodeId) => {
      const m = lookup[nodeId];
      if (!m) return 0;
      let count = 0;
      (m.spouses || []).forEach((sp) => {
        const sid = rid(sp.memberId);
        if (!sid) return;
        const key = [nodeId, sid].sort().join('-');
        const c = couples.get(key);
        if (c && c.status === 'divorced') {
          const sGKey = memberToGroup[sid];
          count += sGKey ? groups.get(sGKey).size : 1;
        }
      });
      return count;
    };

    const getNodeSpan = (nodeId) => {
      const grpSz = getGroupSize(nodeId);
      const divSz = getDivorcedCount(nodeId);
      const baseSpan = grpSz > 1 ? SECTION_W + (grpSz - 1) * spouseStep : SECTION_W;
      const divSpan = divSz > 0 ? divSz * spouseStep + COUPLE_GAP : 0;
      return baseSpan + divSpan;
    };

    // For branch mode, the "span" (perpendicular) is along Y, and depth is along X
    const getNodeHeight = (nodeId) => {
      const grpSz = getGroupSize(nodeId);
      const divSz = getDivorcedCount(nodeId);
      const baseHeight = grpSz > 1 ? CARD_H + (grpSz - 1) * spouseStep : CARD_H;
      const divHeight = divSz > 0 ? divSz * spouseStep + COUPLE_GAP : 0;
      return baseHeight + divHeight;
    };

    // ── D3 layout ────────────────────────────────────────
    const hierarchy = d3.hierarchy(root, (d) => d.children);
    const useCluster = d3Layout === D3_LAYOUTS.CLUSTER;

    if (isBranch) {
      // Branch: left-to-right. nodeSize = [perpendicular(Y), depth(X)]
      const nodePerp = 140;   // vertical gap between nodes
      const nodeDepth = 300;  // horizontal gap between generations
      const layoutFn = useCluster ? d3.cluster() : d3.tree();
      layoutFn.nodeSize([nodePerp, nodeDepth]).separation((a, b) => {
        const aH = getNodeHeight(a.data._id) / nodePerp;
        const bH = getNodeHeight(b.data._id) / nodePerp;
        return (aH + bH) / 2 + H_GAP / nodePerp;
      })(hierarchy);
    } else {
      // Tree: top-down. nodeSize = [perpendicular(X), depth(Y)]
      const nodeW = 240;  // horizontal gap between nodes (increased for spouse spacing)
      const nodeH = 140;  // vertical gap between generations
      const layoutFn = useCluster ? d3.cluster() : d3.tree();
      layoutFn.nodeSize([nodeW, nodeH]).separation((a, b) => {
        const aW = getNodeSpan(a.data._id) / nodeW;
        const bW = getNodeSpan(b.data._id) / nodeW;
        return (aW + bW) / 2 + H_GAP / nodeW;
      })(hierarchy);
    }

    // ── 1. Primary positions from tree layout ────────────
    const pos = {};
    if (isBranch) {
      hierarchy.descendants().forEach((n) => { pos[n.data._id] = { x: n.y, y: n.x }; });
    } else {
      hierarchy.descendants().forEach((n) => { pos[n.data._id] = { x: n.x, y: n.y }; });
    }

    // ── 2. Position group members centered on primary's D3 position ────
    // D3 positioned primary; center the group so children are under group center.
    groups.forEach((grp) => {
      const pp = pos[grp.primaryId];
      if (!pp) return;
      const center = (grp.size - 1) / 2;
      grp.memberIds.forEach((id, i) => {
        if (isBranch) {
          pos[id] = { x: pp.x, y: pp.y + (i - center) * spouseStep };
        } else {
          pos[id] = { x: pp.x + (i - center) * spouseStep, y: pp.y };
        }
      });
    });

    // ── 3. Handle divorced spouses ──
    const allPos = { ...pos };
    divorcedList.forEach((c) => {
      const aIn = !!allPos[c.a];
      const bIn = !!allPos[c.b];
      if (aIn && bIn) return;
      const posId = aIn ? c.a : bIn ? c.b : null;
      const missId = aIn ? c.b : bIn ? c.a : null;
      if (!posId || !missId) return;

      const pGKey = memberToGroup[posId];
      const pGrp = pGKey ? groups.get(pGKey) : null;

      const mGKey = memberToGroup[missId];
      const mGrp = mGKey ? groups.get(mGKey) : null;
      const mIdx = mGrp ? mGrp.memberIds.indexOf(missId) : 0;

      if (isBranch) {
        const pBottomEdge = pGrp
          ? allPos[pGrp.memberIds[pGrp.size - 1]].y + CARD_H / 2
          : allPos[posId].y + CARD_H / 2;
        allPos[missId] = {
          x: allPos[posId].x,
          y: pBottomEdge + COUPLE_GAP + CARD_H / 2,
        };
        if (mGrp) {
          mGrp.memberIds.forEach((mid, mi) => {
            if (mid === missId) return;
            allPos[mid] = { x: allPos[missId].x, y: allPos[missId].y + (mi - mIdx) * spouseStep };
          });
        }
      } else {
        const pRightEdge = pGrp
          ? allPos[pGrp.memberIds[pGrp.size - 1]].x + SECTION_W / 2
          : allPos[posId].x + SECTION_W / 2;
        allPos[missId] = {
          x: pRightEdge + COUPLE_GAP + SECTION_W / 2,
          y: allPos[posId].y,
        };
        if (mGrp) {
          mGrp.memberIds.forEach((mid, mi) => {
            if (mid === missId) return;
            allPos[mid] = { x: allPos[missId].x + (mi - mIdx) * spouseStep, y: allPos[missId].y };
          });
        }
      }
    });

    // ── 4. Remaining unpositioned spouses ──────────────
    let changed = true;
    while (changed) {
      changed = false;
      Object.keys(allPos).forEach((id) => {
        const m = lookup[id];
        if (!m) return;
        (m.spouses || []).forEach((sp) => {
          const sid = rid(sp.memberId);
          if (!sid || !lookup[sid] || allPos[sid]) return;
          if (isBranch) {
            allPos[sid] = { x: allPos[id].x, y: allPos[id].y + spouseStep };
          } else {
            allPos[sid] = { x: allPos[id].x + spouseStep, y: allPos[id].y };
          }
          changed = true;
        });
      });
    }

    // ── 5. Orphan children ─────────────────────────────
    let orphanChanged = true;
    while (orphanChanged) {
      orphanChanged = false;
      const orphanGroups = {};
      members.forEach((m) => {
        if (allPos[m._id]) return;
        const fId = rid(m.fatherId);
        const mId = rid(m.motherId);
        const posParentId = (fId && allPos[fId]) ? fId : (mId && allPos[mId]) ? mId : null;
        if (!posParentId) return;
        const otherParentId = posParentId === fId ? mId : fId;
        const groupKey = otherParentId && allPos[otherParentId]
          ? [posParentId, otherParentId].sort().join('-')
          : posParentId;
        if (!orphanGroups[groupKey]) orphanGroups[groupKey] = { parentId: posParentId, otherParentId, children: [] };
        orphanGroups[groupKey].children.push(m);
      });

      Object.values(orphanGroups).forEach((group) => {
        const pp = allPos[group.parentId];
        const op = group.otherParentId ? allPos[group.otherParentId] : null;

        group.children.sort((a, b) => {
          const aDate = a.birthDate ? new Date(a.birthDate).getTime() : Infinity;
          const bDate = b.birthDate ? new Date(b.birthDate).getTime() : Infinity;
          return aDate - bDate;
        });

        if (isBranch) {
          const baseY = op ? (pp.y + op.y) / 2 : pp.y;
          const baseX = pp.x + SECTION_W + V_GAP;
          const childHeights = group.children.map((child) => {
            const gKey = memberToGroup[child._id];
            if (!gKey) return CARD_H;
            const sz = groups.get(gKey).size;
            return CARD_H + (sz - 1) * spouseStep;
          });
          const totalH = childHeights.reduce((s, h) => s + h, 0) + (group.children.length - 1) * H_GAP;
          let startY = baseY - totalH / 2;

          // Check for occupied positions at this depth
          const occupied = [];
          Object.entries(allPos).forEach(([, ep]) => {
            if (Math.abs(ep.x - baseX) < SECTION_W * 0.6) {
              occupied.push({ top: ep.y - CARD_H / 2, bottom: ep.y + CARD_H / 2 });
            }
          });
          occupied.sort((a, b) => a.top - b.top);
          const proposedTop = startY;
          const proposedBottom = startY + totalH;
          for (const occ of occupied) {
            if (Math.min(proposedBottom, occ.bottom) - Math.max(proposedTop, occ.top) > 0) {
              startY = occ.bottom + H_GAP;
            }
          }

          let cy = startY;
          group.children.forEach((child, i) => {
            const h = childHeights[i];
            allPos[child._id] = { x: baseX, y: cy + h / 2 };
            cy += h + H_GAP;
            orphanChanged = true;
          });
        } else {
          const baseX = op ? (pp.x + op.x) / 2 : pp.x;
          const baseY = pp.y + CARD_H / 2 + V_GAP;
          const childWidths = group.children.map((child) => {
            const gKey = memberToGroup[child._id];
            if (!gKey) return SECTION_W;
            const sz = groups.get(gKey).size;
            return SECTION_W + (sz - 1) * spouseStep;
          });
          const totalW = childWidths.reduce((s, w) => s + w, 0) + (group.children.length - 1) * H_GAP;
          let startX = baseX - totalW / 2;

          // Check for occupied positions at this level
          const occupied = [];
          Object.entries(allPos).forEach(([eid, ep]) => {
            if (Math.abs(ep.y - baseY) < CARD_H * 0.6) {
              const gKey = memberToGroup[eid];
              const grp = gKey ? groups.get(gKey) : null;
              if (grp) {
                const left = Math.min(...grp.memberIds.map((mid) => allPos[mid] ? allPos[mid].x : ep.x)) - SECTION_W / 2;
                const right = Math.max(...grp.memberIds.map((mid) => allPos[mid] ? allPos[mid].x : ep.x)) + SECTION_W / 2;
                occupied.push({ left, right });
              } else {
                occupied.push({ left: ep.x - SECTION_W / 2, right: ep.x + SECTION_W / 2 });
              }
            }
          });
          occupied.sort((a, b) => a.left - b.left);
          const proposedLeft = startX;
          const proposedRight = startX + totalW;
          for (const occ of occupied) {
            if (Math.min(proposedRight, occ.right) - Math.max(proposedLeft, occ.left) > 0) {
              startX = occ.right + H_GAP;
            }
          }

          let cx = startX;
          group.children.forEach((child, i) => {
            const w = childWidths[i];
            allPos[child._id] = { x: cx + w / 2, y: baseY };
            cx += w + H_GAP;
            orphanChanged = true;
          });
        }
      });

      // Position newly-found spouses
      if (orphanChanged) {
        let spChanged = true;
        while (spChanged) {
          spChanged = false;
          Object.keys(allPos).forEach((id) => {
            const m = lookup[id];
            if (!m) return;
            (m.spouses || []).forEach((sp) => {
              const sid = rid(sp.memberId);
              if (!sid || !lookup[sid] || allPos[sid]) return;
              const gKey = memberToGroup[sid];
              if (gKey) {
                const grp = groups.get(gKey);
                const primaryPos = allPos[grp.primaryId];
                if (primaryPos) {
                  grp.memberIds.forEach((mid, mi) => {
                    if (!allPos[mid]) {
                      if (isBranch) {
                        allPos[mid] = { x: primaryPos.x, y: primaryPos.y + (mi - grp.primaryIndex) * spouseStep };
                      } else {
                        allPos[mid] = { x: primaryPos.x + (mi - grp.primaryIndex) * spouseStep, y: primaryPos.y };
                      }
                      spChanged = true;
                    }
                  });
                }
              } else {
                if (isBranch) {
                  allPos[sid] = { x: allPos[id].x, y: allPos[id].y + spouseStep };
                } else {
                  allPos[sid] = { x: allPos[id].x + spouseStep, y: allPos[id].y };
                }
                spChanged = true;
              }
            });
          });
        }
      }
    }

    // ── 5b. Reposition divorced-couple children to center between ex-spouses ──
    const divChildrenProcessed = new Set();
    divorcedList.forEach((c) => {
      if (!allPos[c.a] || !allPos[c.b]) return;
      const siblings = members.filter((sib) => {
        const sfId = rid(sib.fatherId);
        const smId = rid(sib.motherId);
        if (!sfId || !smId) return false;
        const sk = [sfId, smId].sort().join('-');
        return sk === c.key && !divChildrenProcessed.has(sib._id);
      });
      if (siblings.length === 0) return;

      siblings.sort((a, b) => {
        const aDate = a.birthDate ? new Date(a.birthDate).getTime() : Infinity;
        const bDate = b.birthDate ? new Date(b.birthDate).getTime() : Infinity;
        return aDate - bDate;
      });
      siblings.forEach((sib) => divChildrenProcessed.add(sib._id));

      const getEdges = (pid) => {
        const gKey = memberToGroup[pid];
        const grp = gKey ? groups.get(gKey) : null;
        if (grp) {
          if (isBranch) {
            const ys = grp.memberIds.map((mid) => allPos[mid] ? allPos[mid].y : allPos[pid].y);
            return { top: Math.min(...ys) - CARD_H / 2, bottom: Math.max(...ys) + CARD_H / 2, left: allPos[pid].x - SECTION_W / 2, right: allPos[pid].x + SECTION_W / 2 };
          }
          const xs = grp.memberIds.map((mid) => allPos[mid] ? allPos[mid].x : allPos[pid].x);
          return { left: Math.min(...xs) - SECTION_W / 2, right: Math.max(...xs) + SECTION_W / 2 };
        }
        if (isBranch) {
          return { top: allPos[pid].y - CARD_H / 2, bottom: allPos[pid].y + CARD_H / 2, left: allPos[pid].x - SECTION_W / 2, right: allPos[pid].x + SECTION_W / 2 };
        }
        return { left: allPos[pid].x - SECTION_W / 2, right: allPos[pid].x + SECTION_W / 2 };
      };

      if (isBranch) {
        const aEdge = getEdges(c.a);
        const bEdge = getEdges(c.b);
        const topG = aEdge.top < bEdge.top ? aEdge : bEdge;
        const botG = aEdge.top < bEdge.top ? bEdge : aEdge;
        const midY = (topG.bottom + botG.top) / 2;
        const childX = Math.max(allPos[c.a].x, allPos[c.b].x) + SECTION_W + V_GAP;
        const sibHeights = siblings.map((sib) => {
          const gKey = memberToGroup[sib._id];
          if (!gKey) return CARD_H;
          const sz = groups.get(gKey).size;
          return CARD_H + (sz - 1) * spouseStep;
        });
        const totalH = sibHeights.reduce((s, h) => s + h, 0) + (siblings.length - 1) * H_GAP;
        let cy = midY - totalH / 2;
        siblings.forEach((sib, i) => {
          const h = sibHeights[i];
          allPos[sib._id] = { x: childX, y: cy + h / 2 };
          const gKey = memberToGroup[sib._id];
          if (gKey) {
            const grp = groups.get(gKey);
            grp.memberIds.forEach((mid, mi) => {
              allPos[mid] = { x: childX, y: cy + h / 2 + (mi - grp.memberIds.indexOf(sib._id)) * spouseStep };
            });
          }
          cy += h + H_GAP;
        });
      } else {
        const aEdge = getEdges(c.a);
        const bEdge = getEdges(c.b);
        const leftGroup = aEdge.left < bEdge.left ? aEdge : bEdge;
        const rightGroup = aEdge.left < bEdge.left ? bEdge : aEdge;
        const midX = (leftGroup.right + rightGroup.left) / 2;
        const childY = Math.max(allPos[c.a].y, allPos[c.b].y) + CARD_H / 2 + V_GAP;

        const sibWidths = siblings.map((sib) => {
          const gKey = memberToGroup[sib._id];
          if (!gKey) return SECTION_W;
          const sz = groups.get(gKey).size;
          return SECTION_W + (sz - 1) * spouseStep;
        });
        const totalW = sibWidths.reduce((s, w) => s + w, 0) + (siblings.length - 1) * H_GAP;
        let cx = midX - totalW / 2;

        siblings.forEach((sib, i) => {
          const w = sibWidths[i];
          const centerX = cx + w / 2;
          allPos[sib._id] = { x: centerX, y: childY };
          const gKey = memberToGroup[sib._id];
          if (gKey) {
            const grp = groups.get(gKey);
            grp.memberIds.forEach((mid, mi) => {
              allPos[mid] = { x: centerX + (mi - grp.memberIds.indexOf(sib._id)) * spouseStep, y: childY };
            });
          }
          cx += w + H_GAP;
        });
      }
    });

    // ── 6. Overlap resolution ────────────────────────────
    const getExtent = (id) => {
      const gKey = memberToGroup[id];
      const grp = gKey ? groups.get(gKey) : null;
      const p = allPos[id];
      if (!p) return null;
      if (isBranch) {
        if (grp) {
          const ys = grp.memberIds.map((mid) => allPos[mid] ? allPos[mid].y : p.y);
          const top = Math.min(...ys) - CARD_H / 2;
          const bottom = Math.max(...ys) + CARD_H / 2;
          return { left: top, right: bottom, ids: [...grp.memberIds], axis: 'y' };
        }
        return { left: p.y - CARD_H / 2, right: p.y + CARD_H / 2, ids: [id], axis: 'y' };
      }
      if (grp) {
        const xs = grp.memberIds.map((mid) => allPos[mid] ? allPos[mid].x : p.x);
        const left = Math.min(...xs) - SECTION_W / 2;
        const right = Math.max(...xs) + SECTION_W / 2;
        return { left, right, ids: [...grp.memberIds], axis: 'x' };
      }
      return { left: p.x - SECTION_W / 2, right: p.x + SECTION_W / 2, ids: [id], axis: 'x' };
    };

    const LEVEL_TOL = isBranch ? SECTION_W * 0.4 : CARD_H * 0.4;

    for (let pass = 0; pass < 5; pass++) {
      const processed = new Set();
      const extentList = [];

      Object.entries(allPos).forEach(([id, p]) => {
        if (processed.has(id)) return;
        const ext = getExtent(id);
        if (!ext) return;
        ext.ids.forEach((eid) => processed.add(eid));
        const levelVal = isBranch ? p.x : p.y;
        ext._level = levelVal;
        extentList.push(ext);
      });

      const byLevel = {};
      extentList.forEach((ext) => {
        let assigned = false;
        for (const key of Object.keys(byLevel)) {
          if (Math.abs(ext._level - parseFloat(key)) < LEVEL_TOL) {
            byLevel[key].push(ext);
            assigned = true;
            break;
          }
        }
        if (!assigned) {
          byLevel[ext._level] = [ext];
        }
      });

      Object.values(byLevel).forEach((extents) => {
        extents.sort((a, b) => a.left - b.left);
        for (let i = 1; i < extents.length; i++) {
          const prev = extents[i - 1];
          const curr = extents[i];
          const gap = curr.left - prev.right;
          if (gap < H_GAP) {
            const push = H_GAP - gap;
            const prop = isBranch ? 'y' : 'x';
            curr.ids.forEach((eid) => {
              if (allPos[eid]) allPos[eid][prop] += push;
            });
            curr.left += push;
            curr.right += push;
          }
        }
      });
    }

    // ── 6b. Generation alignment — snap same-depth nodes to same row/col ──
    // Compute actual generation for every member using BFS from root
    // Generation = max(father_gen, mother_gen) + 1
    // Married-in spouses get the same generation as their partner
    const genMap = {};
    // Start from root: gen 0
    genMap[effectiveRootId] = 0;
    // BFS pass 1: Assign generations via parent-child relationships
    const genQueue = [effectiveRootId];
    const genVisited = new Set([effectiveRootId]);
    // Also assign spouses of root the same generation
    const rootMember = lookup[effectiveRootId];
    if (rootMember) {
      (rootMember.spouses || []).forEach((sp) => {
        const sid = rid(sp.memberId);
        if (sid && lookup[sid]) {
          genMap[sid] = 0;
          if (!genVisited.has(sid)) {
            genVisited.add(sid);
            genQueue.push(sid);
          }
        }
      });
    }

    while (genQueue.length > 0) {
      const curId = genQueue.shift();
      const curGen = genMap[curId];
      const curM = lookup[curId];
      if (!curM) continue;

      // Assign same generation to all spouses
      (curM.spouses || []).forEach((sp) => {
        const sid = rid(sp.memberId);
        if (sid && lookup[sid] && genMap[sid] === undefined) {
          genMap[sid] = curGen;
          if (!genVisited.has(sid)) {
            genVisited.add(sid);
            genQueue.push(sid);
          }
        }
      });

      // Assign gen+1 to all children (via childrenIds)
      (curM.childrenIds || []).forEach((cRef) => {
        const cId = rid(cRef);
        if (cId && lookup[cId] && genMap[cId] === undefined) {
          genMap[cId] = curGen + 1;
          if (!genVisited.has(cId)) {
            genVisited.add(cId);
            genQueue.push(cId);
          }
        }
      });
    }

    // Pass 2: For any member still unassigned, derive from fatherId/motherId
    members.forEach((m) => {
      if (genMap[m._id] !== undefined) return;
      const fId = rid(m.fatherId);
      const mId = rid(m.motherId);
      const fGen = fId ? genMap[fId] : undefined;
      const mGen = mId ? genMap[mId] : undefined;
      if (fGen !== undefined || mGen !== undefined) {
        const parentGen = Math.max(fGen !== undefined ? fGen : -1, mGen !== undefined ? mGen : -1);
        genMap[m._id] = parentGen + 1;
      }
    });

    // Pass 3: Assign spouses that still don't have a generation
    members.forEach((m) => {
      if (genMap[m._id] !== undefined) return;
      (m.spouses || []).forEach((sp) => {
        const sid = rid(sp.memberId);
        if (sid && genMap[sid] !== undefined && genMap[m._id] === undefined) {
          genMap[m._id] = genMap[sid];
        }
      });
    });

    // Group all positioned bloodline nodes by generation and compute the canonical position
    const depthPositions = {};
    Object.keys(allPos).forEach((id) => {
      const g = genMap[id];
      if (g === undefined) return;
      const p = allPos[id];
      if (!p) return;
      if (!depthPositions[g]) depthPositions[g] = [];
      if (isBranch) {
        depthPositions[g].push(p.x);
      } else {
        depthPositions[g].push(p.y);
      }
    });

    // For each generation, use the maximum value (deepest push) so no card moves backward
    const depthCanonical = {};
    Object.entries(depthPositions).forEach(([d, vals]) => {
      depthCanonical[d] = Math.max(...vals);
    });

    // Apply canonical position to all nodes at each generation
    Object.keys(allPos).forEach((id) => {
      const g = genMap[id];
      if (g === undefined || depthCanonical[g] === undefined) return;
      if (isBranch) {
        allPos[id].x = depthCanonical[g];
      } else {
        allPos[id].y = depthCanonical[g];
      }
    });

    // ── 6c. Post-generation-snap overlap resolution ──────
    // After snapping nodes to their correct generation row/column, cards that
    // were previously on different levels may now share a row and overlap.
    // We must also cascade any push to descendant subtrees.
    const collectAllDescendants = (startId) => {
      const result = new Set();
      const stack = [startId];
      while (stack.length > 0) {
        const nid = stack.pop();
        const mem = lookup[nid];
        if (!mem) continue;
        (mem.childrenIds || []).forEach((cRef) => {
          const cId = rid(cRef);
          if (cId && allPos[cId] && !result.has(cId)) {
            result.add(cId);
            // Also include spouse group members
            const gKey = memberToGroup[cId];
            if (gKey) {
              groups.get(gKey).memberIds.forEach((mid) => {
                if (allPos[mid]) result.add(mid);
              });
            }
            stack.push(cId);
          }
        });
        // Also push children found through fatherId/motherId references
        members.forEach((child) => {
          const cfId = rid(child.fatherId);
          const cmId = rid(child.motherId);
          if ((cfId === nid || cmId === nid) && allPos[child._id] && !result.has(child._id)) {
            result.add(child._id);
            const gKey = memberToGroup[child._id];
            if (gKey) {
              groups.get(gKey).memberIds.forEach((mid) => {
                if (allPos[mid]) result.add(mid);
              });
            }
            stack.push(child._id);
          }
        });
      }
      return result;
    };

    for (let pass = 0; pass < 5; pass++) {
      const processed = new Set();
      const extentList = [];

      Object.keys(allPos).forEach((id) => {
        if (processed.has(id)) return;
        const ext = getExtent(id);
        if (!ext) return;
        ext.ids.forEach((eid) => processed.add(eid));
        ext._gen = genMap[id];
        extentList.push(ext);
      });

      // Group by generation (exact match)
      const byGen = {};
      extentList.forEach((ext) => {
        const g = ext._gen;
        if (g === undefined) return;
        if (!byGen[g]) byGen[g] = [];
        byGen[g].push(ext);
      });

      Object.values(byGen).forEach((extents) => {
        extents.sort((a, b) => a.left - b.left);
        for (let i = 1; i < extents.length; i++) {
          const prev = extents[i - 1];
          const curr = extents[i];
          const gap = curr.left - prev.right;
          if (gap < H_GAP) {
            const push = H_GAP - gap;
            const prop = isBranch ? 'y' : 'x';
            // Collect all descendant IDs from the current extent's members
            const descIds = new Set();
            curr.ids.forEach((eid) => {
              collectAllDescendants(eid).forEach((did) => descIds.add(did));
            });
            // Push the extent itself
            curr.ids.forEach((eid) => {
              if (allPos[eid]) allPos[eid][prop] += push;
            });
            // Push all descendants
            descIds.forEach((did) => {
              if (allPos[did] && !curr.ids.includes(did)) {
                allPos[did][prop] += push;
              }
            });
            curr.left += push;
            curr.right += push;
            // Also update extents of later items that were shifted
            for (let j = i + 1; j < extents.length; j++) {
              const later = extents[j];
              const wasShifted = later.ids.some((eid) => descIds.has(eid));
              if (wasShifted) {
                later.left += push;
                later.right += push;
              }
            }
          }
        }
      });
    }

    // ── Helpers ──────────────────────────────────────────
    function bezierLink(sx, sy, tx, ty) {
      if (isBranch) {
        // Left-to-right Bezier: horizontal S-curve
        const midX = sx + (tx - sx) * 0.5;
        return `M${sx},${sy} C${midX},${sy} ${midX},${ty} ${tx},${ty}`;
      }
      // Top-down Bezier: vertical S-curve
      const midY = sy + (ty - sy) * 0.5;
      return `M${sx},${sy} C${sx},${midY} ${tx},${midY} ${tx},${ty}`;
    }

    // ── 6d. Align only-children under parent center for straight links ──
    // For any child who is the sole child of their parent couple, shift the
    // child (and its spouse group + all descendants) so it aligns directly
    // under the parent link source, making the connection a straight line.
    // Skip if the shift would cause overlap with existing nodes.
    const processedOnlyChild = new Set();
    members.forEach((m) => {
      if (!allPos[m._id] || processedOnlyChild.has(m._id)) return;

      const fId = rid(m.fatherId);
      const mId = rid(m.motherId);
      if (!fId && !mId) return;

      // Check if this is the ONLY child of this parent couple
      const siblings = members.filter((sib) => {
        if (sib._id === m._id) return false;
        const sfId = rid(sib.fatherId);
        const smId = rid(sib.motherId);
        return ((sfId === fId && smId === mId) || (sfId === mId && smId === fId)) && allPos[sib._id];
      });
      if (siblings.length > 0) return;

      // Compute parent link source (midpoint)
      let parentAlignVal;
      if (fId && mId && allPos[fId] && allPos[mId]) {
        if (isBranch) {
          parentAlignVal = (allPos[fId].y + allPos[mId].y) / 2;
        } else {
          parentAlignVal = (allPos[fId].x + allPos[mId].x) / 2;
        }
      } else {
        const parentId = fId && allPos[fId] ? fId : mId;
        const pp = allPos[parentId];
        if (!pp) return;
        parentAlignVal = isBranch ? pp.y : pp.x;
      }

      // Compute current child group center along the alignment axis
      const gKey = memberToGroup[m._id];
      const grp = gKey ? groups.get(gKey) : null;
      const groupIds = grp ? [...grp.memberIds] : [m._id];
      let childGroupCenter;
      if (isBranch) {
        const ys = groupIds.map((id) => allPos[id] ? allPos[id].y : allPos[m._id].y);
        childGroupCenter = (Math.min(...ys) + Math.max(...ys)) / 2;
      } else {
        const xs = groupIds.map((id) => allPos[id] ? allPos[id].x : allPos[m._id].x);
        childGroupCenter = (Math.min(...xs) + Math.max(...xs)) / 2;
      }

      const shift = parentAlignVal - childGroupCenter;
      if (Math.abs(shift) < 1) return; // Already aligned

      // Collect all IDs to shift: group members + all descendants
      const idsToShift = new Set(groupIds);
      const descStack = [...groupIds];
      while (descStack.length > 0) {
        const nid = descStack.pop();
        members.forEach((child) => {
          const cfId = rid(child.fatherId);
          const cmId = rid(child.motherId);
          if ((cfId === nid || cmId === nid) && allPos[child._id] && !idsToShift.has(child._id)) {
            idsToShift.add(child._id);
            descStack.push(child._id);
            // Also include child's spouse group
            const cGKey = memberToGroup[child._id];
            if (cGKey) {
              groups.get(cGKey).memberIds.forEach((mid) => {
                if (allPos[mid] && !idsToShift.has(mid)) {
                  idsToShift.add(mid);
                  descStack.push(mid);
                }
              });
            }
          }
        });
      }

      // Overlap check: will the shift cause collision with other nodes at same generation?
      const gen = genMap[m._id];
      const prop = isBranch ? 'y' : 'x';
      let wouldOverlap = false;

      if (gen !== undefined) {
        // Get extents of all nodes at same generation that are NOT in the shift set
        const shiftedExtents = [];
        const otherExtents = [];
        groupIds.forEach((id) => {
          const ext = getExtent(id);
          if (ext) shiftedExtents.push({ left: ext.left + shift, right: ext.right + shift });
        });

        Object.keys(allPos).forEach((id) => {
          if (idsToShift.has(id)) return;
          if (genMap[id] !== gen) return;
          const ext = getExtent(id);
          if (!ext) return;
          otherExtents.push(ext);
        });

        for (const se of shiftedExtents) {
          for (const oe of otherExtents) {
            if (se.left < oe.right + H_GAP && se.right > oe.left - H_GAP) {
              wouldOverlap = true;
              break;
            }
          }
          if (wouldOverlap) break;
        }
      }

      if (wouldOverlap) return;

      // Apply shift to all collected IDs
      idsToShift.forEach((id) => {
        if (allPos[id]) allPos[id][prop] += shift;
      });
      idsToShift.forEach((id) => processedOnlyChild.add(id));
    });

    // ── Detect members with hidden ancestors ──────────────
    const hasHiddenAncestor = new Set();
    members.forEach((m) => {
      if (!allPos[m._id]) return;
      const fId = rid(m.fatherId);
      const mId = rid(m.motherId);
      if ((fId && !allPos[fId] && lookup[fId]) || (mId && !allPos[mId] && lookup[mId])) {
        hasHiddenAncestor.add(m._id);
      }
    });

    // Find oldest ancestor by walking fatherId/motherId chain
    function findOldestAncestor(startId) {
      const visited = new Set();
      const queue = [startId];
      visited.add(startId);
      let oldest = startId;
      let oldestBirth = lookup[startId]?.birthDate ? new Date(lookup[startId].birthDate).getTime() : Infinity;

      while (queue.length) {
        const cid = queue.shift();
        const m = lookup[cid];
        if (!m) continue;
        const fId = rid(m.fatherId);
        const mId = rid(m.motherId);
        [fId, mId].forEach((pid) => {
          if (pid && lookup[pid] && !visited.has(pid)) {
            visited.add(pid);
            queue.push(pid);
            const bd = lookup[pid].birthDate ? new Date(lookup[pid].birthDate).getTime() : Infinity;
            if (bd < oldestBirth) { oldestBirth = bd; oldest = pid; }
          }
        });
      }
      return oldest;
    }

    // ── Build card data ──────────────────────────────────
    const groupCardData = [];
    const renderedInGroup = new Set();

    groups.forEach((grp, key) => {
      const pp = allPos[grp.primaryId];
      if (!pp) return;
      const mems = grp.memberIds.map((id, i) => ({
        id,
        data: lookup[id],
        index: i,
        x: allPos[id] ? allPos[id].x : pp.x,
        y: allPos[id] ? allPos[id].y : pp.y,
      }));

      // Compute group center & bounding box from actual member positions
      const xs = mems.map((m) => m.x);
      const ys = mems.map((m) => m.y);
      const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
      const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;

      if (isBranch) {
        const topMost = Math.min(...ys) - CARD_H / 2;
        const botMost = Math.max(...ys) + CARD_H / 2;
        groupCardData.push({
          key, members: mems, primaryId: grp.primaryId, size: grp.size,
          groupW: SECTION_W, groupH: botMost - topMost,
          leftEdge: pp.x - SECTION_W / 2, topEdge: topMost, y: topMost,
          centerX, centerY,
        });
      } else {
        const leftMost = Math.min(...xs) - SECTION_W / 2;
        const rightMost = Math.max(...xs) + SECTION_W / 2;
        groupCardData.push({
          key, members: mems, primaryId: grp.primaryId, size: grp.size,
          groupW: rightMost - leftMost, groupH: CARD_H,
          leftEdge: leftMost, topEdge: pp.y, y: pp.y,
          centerX, centerY,
        });
      }
      grp.memberIds.forEach((id) => renderedInGroup.add(id));
    });

    const singleCardData = [];
    members.forEach((m) => {
      if (!allPos[m._id]) return;
      if (renderedInGroup.has(m._id)) return;
      singleCardData.push({ data: m, x: allPos[m._id].x, y: allPos[m._id].y });
    });

    // ── Child link source computation ────────────────────
    function getChildLinkSource(m) {
      const fId = rid(m.fatherId);
      const mId = rid(m.motherId);
      if (!fId && !mId) return null;

      let srcX, srcY, linkColor = '#5c6bc0', linkDash = '', linkOpacity = 0.8;

      if (fId && mId && allPos[fId] && allPos[mId]) {
        const coupleKey = [fId, mId].sort().join('-');
        const couple = couples.get(coupleKey);
        const isDivorced = couple?.status === 'divorced';

        if (isDivorced) {
          linkColor = '#e65100'; linkDash = '5,5'; linkOpacity = 0.7;
        }

        if (isBranch) {
          srcX = Math.max(allPos[fId].x, allPos[mId].x) + SECTION_W / 2;
          srcY = (allPos[fId].y + allPos[mId].y) / 2;
        } else {
          srcX = (allPos[fId].x + allPos[mId].x) / 2;
          srcY = Math.max(allPos[fId].y, allPos[mId].y) + CARD_H / 2;
        }
      } else {
        const parentId = fId && allPos[fId] ? fId : mId;
        const pp = allPos[parentId];
        if (!pp) return null;
        if (isBranch) {
          srcX = pp.x + SECTION_W / 2;
          srcY = pp.y;
        } else {
          srcX = pp.x;
          srcY = pp.y + CARD_H / 2;
        }
      }

      return { srcX, srcY, linkColor, linkDash, linkOpacity, fId, mId };
    }

    function getChildTarget(m) {
      const p = allPos[m._id];
      if (!p) return null;
      if (isBranch) return { x: p.x - SECTION_W / 2, y: p.y };
      return { x: p.x, y: p.y - CARD_H / 2 };
    }

    // ── 7. DRAW CHILD LINKS ─────────────────────────────
    const childLinkElems = {};
    members.forEach((m) => {
      const childPos = getChildTarget(m);
      if (!childPos) return;
      const info = getChildLinkSource(m);
      if (!info) return;

      // Use straight line when source and target are aligned (single leaf child)
      const aligned = isBranch
        ? Math.abs(info.srcY - childPos.y) < 1
        : Math.abs(info.srcX - childPos.x) < 1;
      const linkPath = aligned
        ? `M${info.srcX},${info.srcY} L${childPos.x},${childPos.y}`
        : bezierLink(info.srcX, info.srcY, childPos.x, childPos.y);

      const path = g.append('path')
        .attr('class', 'child-link')
        .attr('d', linkPath)
          .attr('fill', 'none').attr('stroke', info.linkColor)
        .attr('stroke-width', 1.5).attr('opacity', info.linkOpacity)
        .attr('stroke-linejoin', 'round')
        .attr('stroke-dasharray', info.linkDash || '0');

      childLinkElems[m._id] = { path, fId: info.fId, mId: info.mId };
    });

    // ── updateLinksForMember ─────────────────────────────
    function recomputeChildLink(cid) {
      const ce = childLinkElems[cid];
      if (!ce) return;
      const childMember = lookup[cid];
      if (!childMember) return;
      const childPos = getChildTarget(childMember);
      if (!childPos) return;
      const info = getChildLinkSource(childMember);
      if (!info) return;
      const aligned = isBranch
        ? Math.abs(info.srcY - childPos.y) < 1
        : Math.abs(info.srcX - childPos.x) < 1;
      const linkPath = aligned
        ? `M${info.srcX},${info.srcY} L${childPos.x},${childPos.y}`
        : bezierLink(info.srcX, info.srcY, childPos.x, childPos.y);
      ce.path
        .attr('d', linkPath)
        .attr('stroke', info.linkColor).attr('opacity', info.linkOpacity)
        .attr('stroke-linejoin', 'round')
        .attr('stroke-dasharray', info.linkDash || '0');
    }

    function updateLinksForMember(memberId) {
      recomputeChildLink(memberId);
      Object.keys(childLinkElems).forEach((cid) => {
        if (cid === memberId) return;
        const ce = childLinkElems[cid];
        if (ce.fId === memberId || ce.mId === memberId) recomputeChildLink(cid);
      });
    }

    // ── Upstream & Downstream highlight ───────────────────────────────
    let highlightedLinks = [];

    function clearHighlight() {
      highlightedLinks.forEach((el) => {
        el.path
          .attr('stroke', el.origColor)
          .attr('stroke-width', el.origWidth)
          .attr('opacity', el.origOpacity)
          .classed('link-highlighted', false)
          .classed('link-parent', false)
          .classed('link-child', false);
      });
      highlightedLinks = [];
      g.selectAll('.child-link:not(.link-highlighted)')
        .attr('opacity', function () { return d3.select(this).attr('data-orig-opacity') || 0.8; });
      g.selectAll('.tree-node').classed('node-dimmed', false);
    }

    // Get all descendant IDs (children, grandchildren, etc.)
    function getDescendantIds(memberId) {
      const descendantIds = new Set();
      const queue = [memberId];
      while (queue.length) {
        const mid = queue.shift();
        const m = lookup[mid];
        if (!m) continue;
        const children = (m.childrenIds || []).map(c => rid(c)).filter(Boolean);
        children.forEach(cid => {
          if (!descendantIds.has(cid)) {
            descendantIds.add(cid);
            queue.push(cid);
          }
        });
      }
      return descendantIds;
    }

    function highlightUpstream(memberId) {
      clearHighlight();
      const ancestorIds = new Set();
      const queue = [memberId];
      ancestorIds.add(memberId);
      while (queue.length) {
        const cid = queue.shift();
        const m = lookup[cid];
        if (!m) continue;
        const fId = rid(m.fatherId);
        const mId = rid(m.motherId);
        if (fId && !ancestorIds.has(fId)) { ancestorIds.add(fId); queue.push(fId); }
        if (mId && !ancestorIds.has(mId)) { ancestorIds.add(mId); queue.push(mId); }
      }

      Object.entries(childLinkElems).forEach(([cid, ce]) => {
        if (ancestorIds.has(cid)) {
          const origColor = ce.path.attr('data-orig-color') || ce.path.attr('stroke');
          const origWidth = parseFloat(ce.path.attr('data-orig-width') || ce.path.attr('stroke-width'));
          const origOpacity = parseFloat(ce.path.attr('data-orig-opacity') || ce.path.attr('opacity'));
          if (!ce.path.attr('data-orig-color')) {
            ce.path.attr('data-orig-color', origColor);
            ce.path.attr('data-orig-width', origWidth);
            ce.path.attr('data-orig-opacity', origOpacity);
          }
          ce.path
            .attr('stroke', '#1976d2')
            .attr('stroke-width', 3)
            .attr('opacity', 1)
            .classed('link-highlighted', true)
            .raise();
          highlightedLinks.push({ path: ce.path, origColor, origWidth, origOpacity });
        }
      });

      // Also highlight downstream/children links in green
      const directChildIds = new Set((lookup[memberId]?.childrenIds || []).map(c => typeof c === "object" ? c._id : c).filter(Boolean));
      Object.entries(childLinkElems).forEach(([key, ce]) => {
        if (!ce || !ce.path) return;
        const childId = key; // key is the child member ID
        if (directChildIds.has(childId)) {
          let origColor = ce.path.attr("data-orig-color") || ce.path.attr("stroke");
          let origWidth = ce.path.attr("data-orig-width") || ce.path.attr("stroke-width");
          let origOpacity = ce.path.attr("data-orig-opacity") || ce.path.attr("opacity");
          ce.path.attr("stroke", "#43a047").attr("stroke-width", 3).attr("opacity", 1).classed("link-highlighted", true).classed("link-child", true).raise();
          highlightedLinks.push({ path: ce.path, origColor, origWidth, origOpacity });
        }
      });


      g.selectAll('.child-link:not(.link-highlighted)')
        .each(function () {
          const el = d3.select(this);
          if (!el.attr('data-orig-opacity')) el.attr('data-orig-opacity', el.attr('opacity'));
        })
        .attr('opacity', 0.15);

      g.selectAll('.tree-node').classed('node-dimmed', true);
      g.selectAll('.tree-node').each(function (d) {
        const nodeIds = d?.members ? d.members.map((m) => m.id) : d?.data ? [d.data._id] : [];
        if (nodeIds.some((id) => ancestorIds.has(id) || directChildIds.has(id) || id === memberId)) {
          d3.select(this).classed('node-dimmed', false);
        }
      });
    }

    svg.on('click', () => { clearHighlight(); setFocusedMemberId(null); if (onSelectMemberRef.current) onSelectMemberRef.current(null); });

    // ── Visibility filter ────────────────────────────────
    const isVisible = (m) => {
      if (activeFilter === FILTERS.ALL) return true;
      const fId = rid(m.fatherId);
      const mId = rid(m.motherId);
      const f = fId ? lookup[fId] : null;
      const mo = mId ? lookup[mId] : null;
      if (activeFilter === FILTERS.LIVING) return m.isLiving;
      if (activeFilter === FILTERS.DECEASED)
        return !m.isLiving || (f && !f.isLiving) || (mo && !mo.isLiving);
      if (activeFilter === FILTERS.DIVORCED) {
        const hasDiv = (m.spouses || []).some((s) => s.status === 'divorced');
        const parentDiv = f?.spouses?.some((s) => s.status === 'divorced') ||
          mo?.spouses?.some((s) => s.status === 'divorced');
        return hasDiv || parentDiv;
      }
      return true;
    };

    const isCurrentRoot = (id) => id === effectiveRootId;

    // ══════════════════════════════════════════════════════
    // 8. DRAW GROUP CARDS
    // ══════════════════════════════════════════════════════
    const groupNodes = g.selectAll('.tree-node-group')
      .data(groupCardData)
      .join('g')
      .attr('class', 'tree-node tree-node-group')
      .attr('transform', (d) => `translate(${d.centerX}, ${d.centerY})`);

    groupNodes.each(function (d) {
      const node = d3.select(this);

      d.members.forEach((mem, i) => {
        const p = mem.data;
        // Position card relative to group center
        const cardCX = mem.x - d.centerX;  // center offset from group center
        const cardCY = mem.y - d.centerY;
        const cardX = cardCX - SECTION_W / 2;
        const cardY = cardCY - CARD_H / 2;

        // Individual card rect per member
        node.append('rect')
          .attr('x', cardX).attr('y', cardY)
          .attr('width', SECTION_W).attr('height', CARD_H).attr('rx', 10)
          .attr('fill', () => {
            if (!p.isLiving) return '#eceff1';
            if (p.gender === 'male') return '#e3f2fd';
            if (p.gender === 'female') return '#fce4ec';
            return '#f5f5f5';
          })
          .attr('stroke', () => {
            if (isCurrentRoot(mem.id)) return '#ff6f00';
            if (!p.isLiving) return '#90a4ae';
            const hasDiv = (p.spouses || []).some((s) => s.status === 'divorced');
            if (hasDiv) return '#e65100';
            if (p.gender === 'male') return '#1976d2';
            if (p.gender === 'female') return '#c2185b';
            return '#9e9e9e';
          })
          .attr('stroke-width', isCurrentRoot(mem.id) ? 2.5 : 1.5)
          .attr('filter', 'drop-shadow(0 1px 3px rgba(0,0,0,0.1))')
          .attr('opacity', isVisible(p) ? 1 : 0.3)
          .style('cursor', 'pointer')
          .on('click', (e) => { e.stopPropagation(); highlightUpstream(mem.id); setFocusedMemberId(mem.id); if (onSelectMemberRef.current) onSelectMemberRef.current(lookup[mem.id]); });

        // Connection line + relationship emoji between adjacent cards
        if (i > 0) {
          const prevMem = d.members[i - 1];
          const prevCX = prevMem.x - d.centerX;
          const prevCY = prevMem.y - d.centerY;
          const coupleKey = [prevMem.id, mem.id].sort().join('-');
          const couple = couples.get(coupleKey);
          const status = couple ? couple.status : 'married';
          const emoji = status === 'widowed' ? '🕊️' : status === 'divorced' ? '⚡' : '❤️';

          if (isBranch) {
            // Vertical connection line between cards
            const lineX = prevCX;
            const lineY1 = prevCY + CARD_H / 2;
            const lineY2 = cardCY - CARD_H / 2;
            node.append('line')
              .attr('x1', lineX).attr('y1', lineY1)
              .attr('x2', lineX).attr('y2', lineY2)
              .attr('stroke', '#bdbdbd').attr('stroke-width', 1.2);
            node.append('text')
              .attr('x', lineX).attr('y', (lineY1 + lineY2) / 2)
              .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
              .attr('font-size', '10px')
              .text(emoji);
          } else {
            // Horizontal connection line between cards
            const lineX1 = prevCX + SECTION_W / 2;
            const lineX2 = cardCX - SECTION_W / 2;
            const lineY = 0; // centered vertically in group
            node.append('line')
              .attr('x1', lineX1).attr('y1', lineY)
              .attr('x2', lineX2).attr('y2', lineY)
              .attr('stroke', '#bdbdbd').attr('stroke-width', 1.2);
            // Icon centered between the two cards
            node.append('text')
              .attr('x', (prevCX + cardCX) / 2).attr('y', lineY)
              .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
              .attr('font-size', '10px')
              .text(emoji);
          }
        }

        // Left 1/3: Profile picture area (PHOTO_W = 60px)
        const photoSize = 50;
        const photoX = cardX + (PHOTO_W - photoSize) / 2;
        const photoY = cardY + (CARD_H - photoSize) / 2;
        const clipId = `clip-group-${d.id}-${i}`;

        // Define clip path for rounded square
        const defs = node.append('defs');
        defs.append('clipPath')
          .attr('id', clipId)
          .append('rect')
          .attr('x', photoX).attr('y', photoY)
          .attr('width', photoSize).attr('height', photoSize)
          .attr('rx', 8).attr('ry', 8);

        // Photo background rounded square
        node.append('rect')
          .attr('x', photoX).attr('y', photoY)
          .attr('width', photoSize).attr('height', photoSize)
          .attr('rx', 8).attr('ry', 8)
          .attr('fill', '#f5f5f5')
          .attr('stroke', '#e0e0e0').attr('stroke-width', 1);

        // Display photo if available, otherwise show emoji
        if (p.photo) {
          node.append('image')
            .attr('x', photoX).attr('y', photoY)
            .attr('width', photoSize).attr('height', photoSize)
            .attr('href', p.photo)
            .attr('clip-path', `url(#${clipId})`)
            .attr('preserveAspectRatio', 'xMidYMid slice');
        } else {
          node.append('text')
            .attr('x', cardX + PHOTO_W / 2).attr('y', cardY + CARD_H / 2 + 2)
            .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
            .attr('font-size', '28px')
            .text(!p.isLiving ? '🪦' : p.gender === 'male' ? '👨' : p.gender === 'female' ? '👩' : '🧑');
        }

        // Right 2/3: Info area (INFO_W = 120px)
        const infoX = cardX + PHOTO_W + 4;

        // Line 1: Bold Saint Name
        node.append('text')
          .attr('x', infoX).attr('y', cardY + 18)
          .attr('font-size', '10px').attr('font-weight', '700')
          .attr('fill', '#5c6bc0')
          .text(() => {
            const saint = p.saintName || '';
            return saint.length > 14 ? saint.substring(0, 14) + '…' : saint;
          });

        // Line 2: lastName middleName vnName (full words)
        node.append('text')
          .attr('x', infoX).attr('y', cardY + 34)
          .attr('font-size', '11px').attr('font-weight', '600')
          .attr('fill', p.isLiving ? '#212121' : '#78909c')
          .text(() => {
            const last = p.lastName || '';
            const middle = p.middleName || '';
            const vn = p.vnName || '';
            return [last, middle, vn].filter(Boolean).join(' ');
          });

        // Line 3: firstName
        node.append('text')
          .attr('x', infoX).attr('y', cardY + 50)
          .attr('font-size', '10px').attr('fill', p.isLiving ? '#424242' : '#78909c')
          .text(() => {
            const first = p.firstName || '';
            return first.length > 14 ? first.substring(0, 14) + '…' : first;
          });

        // Explore icon for members with hidden ancestors
          if (hasHiddenAncestor.has(mem.id)) {
            const expX = cardX + SECTION_W - 26;
            const expY = cardY + CARD_H - 18;
            const expW = 22;
            const expH = 16;
            console.log('Adding expand icon for member:', mem.id, 'at', expX, expY);
            node.append('rect')
              .attr('x', expX).attr('y', expY)
              .attr('width', expW).attr('height', expH).attr('rx', 4)
              .attr('fill', '#e8eaf6').attr('stroke', '#7986cb').attr('stroke-width', 0.8)
              .style('cursor', 'pointer')
              .on('mousedown', (e) => { e.stopPropagation(); })
              .on('touchstart', (e) => { e.stopPropagation(); })
              .on('click', (e) => {
                e.stopPropagation();
                // Navigate to parent's branch - use actual parent from member data
                const memberData = lookup[mem.id];
                const fatherId = memberData?.fatherId?._id || memberData?.fatherId;
                const motherId = memberData?.motherId?._id || memberData?.motherId;
                const parentId = fatherId || motherId;
                if (parentId && parentId !== viewRootId) {
                  setViewRootId(parentId);
                } else {
                  // If no parent or already at parent, go to full tree
                  setViewRootId(null);
                }
              });
            node.append('text')
            .attr('x', expX + expW / 2).attr('y', expY + expH / 2)
            .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
            .attr('font-size', '11px')
            .style('cursor', 'pointer').style('pointer-events', 'none')
            .text('🔍');
        }
      });

      if (d.members.some((m) => isCurrentRoot(m.id)) && viewRootId) {
          node.append('text')
            .attr('x', 0).attr('y', -(d.groupH / 2) - 3)
          .attr('text-anchor', 'middle').attr('font-size', '13px')
          .text('👑');
      }
    });


    // ══════════════════════════════════════════════════════
    // 9. DRAW SINGLE CARDS
    // ══════════════════════════════════════════════════════
    const nodes = g.selectAll('.tree-node-single')
      .data(singleCardData)
      .join('g')
      .attr('class', 'tree-node tree-node-single')
      .attr('transform', (d) => `translate(${d.x - SECTION_W / 2}, ${d.y - CARD_H / 2})`);

    nodes.append('rect')
      .attr('width', SECTION_W).attr('height', CARD_H).attr('rx', 10)
      .attr('fill', (d) => {
        if (!d.data.isLiving) return '#eceff1';
        if (d.data.gender === 'male') return '#e3f2fd';
        if (d.data.gender === 'female') return '#fce4ec';
        return '#f5f5f5';
      })
      .attr('stroke', (d) => {
        if (isCurrentRoot(d.data._id)) return '#ff6f00';
        if (!d.data.isLiving) return '#90a4ae';
        const hasDiv = (d.data.spouses || []).some((s) => s.status === 'divorced');
        if (hasDiv) return '#e65100';
        if (d.data.gender === 'male') return '#1976d2';
        if (d.data.gender === 'female') return '#c2185b';
        return '#9e9e9e';
      })
      .attr('stroke-width', (d) => isCurrentRoot(d.data._id) ? 2.5 : 1.5)
      .attr('filter', 'drop-shadow(0 1px 3px rgba(0,0,0,0.1))')
      .attr('opacity', (d) => (isVisible(d.data) ? 1 : 0.3))
      .style('cursor', 'pointer')
      .on('click', (e, d) => { e.stopPropagation(); highlightUpstream(d.data._id); setFocusedMemberId(d.data._id); if (onSelectMemberRef.current) onSelectMemberRef.current(d.data); });

    nodes.filter((d) => isCurrentRoot(d.data._id) && viewRootId)
      .append('text')
      .attr('x', SECTION_W - 12).attr('y', -3)
      .attr('text-anchor', 'middle').attr('font-size', '13px')
      .text('👑');

    // Left 1/3: Photo area - rounded square
    const photoSize = 50;
    const photoX = (PHOTO_W - photoSize) / 2;
    const photoY = (CARD_H - photoSize) / 2;

    // Define clip paths for each node
    nodes.each(function(d) {
      const clipId = `clip-single-${d.data._id}`;
      d3.select(this).append('defs')
        .append('clipPath')
        .attr('id', clipId)
        .append('rect')
        .attr('x', photoX).attr('y', photoY)
        .attr('width', photoSize).attr('height', photoSize)
        .attr('rx', 8).attr('ry', 8);
    });

    // Photo background rounded square
    nodes.append('rect')
      .attr('x', photoX).attr('y', photoY)
      .attr('width', photoSize).attr('height', photoSize)
      .attr('rx', 8).attr('ry', 8)
      .attr('fill', '#f5f5f5')
      .attr('stroke', '#e0e0e0').attr('stroke-width', 1);

    // Display photo if available
    nodes.filter((d) => d.data.photo)
      .append('image')
      .attr('x', photoX).attr('y', photoY)
      .attr('width', photoSize).attr('height', photoSize)
      .attr('href', (d) => d.data.photo)
      .attr('clip-path', (d) => `url(#clip-single-${d.data._id})`)
      .attr('preserveAspectRatio', 'xMidYMid slice');

    // Show emoji fallback for members without photo
    nodes.filter((d) => !d.data.photo)
      .append('text')
      .attr('x', PHOTO_W / 2).attr('y', CARD_H / 2 + 2)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('font-size', '28px')
      .text((d) => (!d.data.isLiving ? '🪦' : d.data.gender === 'male' ? '👨' : d.data.gender === 'female' ? '👩' : '🧑'));

    // Line 1: Bold Saint Name
    nodes.append('text')
      .attr('x', PHOTO_W + 4).attr('y', 18)
      .attr('font-size', '10px').attr('font-weight', '700')
      .attr('fill', '#5c6bc0')
      .text((d) => {
        const saint = d.data.saintName || '';
        return saint.length > 14 ? saint.substring(0, 14) + '…' : saint;
      });

    // Line 2: lastName middleName vnName (full words)
    nodes.append('text')
      .attr('x', PHOTO_W + 4).attr('y', 34)
      .attr('font-size', '11px').attr('font-weight', '600')
      .attr('fill', (d) => (d.data.isLiving ? '#212121' : '#78909c'))
      .text((d) => {
        const last = d.data.lastName || '';
        const middle = d.data.middleName || '';
        const vn = d.data.vnName || '';
        return [last, middle, vn].filter(Boolean).join(' ');
      });

    // Line 3: firstName
    nodes.append('text')
      .attr('x', PHOTO_W + 4).attr('y', 50)
      .attr('font-size', '10px').attr('fill', (d) => (d.data.isLiving ? '#424242' : '#78909c'))
      .text((d) => {
        const first = d.data.firstName || '';
        return first.length > 14 ? first.substring(0, 14) + '…' : first;
      });

    // Explore icon for single cards with hidden ancestors
    nodes.filter((d) => hasHiddenAncestor.has(d.data._id))
      .each(function (d) {
        const n = d3.select(this);
        const expX = SECTION_W - 26;
        const expY = CARD_H - 18;
        const expW = 22;
        const expH = 16;
        n.append('rect')
          .attr('x', expX).attr('y', expY)
          .attr('width', expW).attr('height', expH).attr('rx', 4)
          .attr('fill', '#e8eaf6').attr('stroke', '#7986cb').attr('stroke-width', 0.8)
          .style('cursor', 'pointer')
          .on('mousedown', (e) => { e.stopPropagation(); })
          .on('touchstart', (e) => { e.stopPropagation(); })
          .on('click', (e) => {
            e.stopPropagation();
            const oldest = findOldestAncestor(d.data._id);
            setViewRootId(oldest);
          });
        n.append('text')
          .attr('x', expX + expW / 2).attr('y', expY + expH / 2)
          .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
          .attr('font-size', '11px')
          .style('pointer-events', 'none')
          .text('🔍');
      });

    // Single card drag

    // ── 10. Divorced link lines ───────────────────────────
    divorcedList.forEach((c) => {
      const pA = allPos[c.a];
      const pB = allPos[c.b];
      if (!pA || !pB) return;

      const aGKey = memberToGroup[c.a];
      const bGKey = memberToGroup[c.b];
      const aGrp = aGKey ? groups.get(aGKey) : null;
      const bGrp = bGKey ? groups.get(bGKey) : null;

      if (isBranch) {
        const aTopEdge = aGrp ? Math.min(...aGrp.memberIds.map((mid) => allPos[mid].y)) - CARD_H / 2 : pA.y - CARD_H / 2;
        const aBottomEdge = aGrp ? Math.max(...aGrp.memberIds.map((mid) => allPos[mid].y)) + CARD_H / 2 : pA.y + CARD_H / 2;
        const bTopEdge = bGrp ? Math.min(...bGrp.memberIds.map((mid) => allPos[mid].y)) - CARD_H / 2 : pB.y - CARD_H / 2;
        const bBottomEdge = bGrp ? Math.max(...bGrp.memberIds.map((mid) => allPos[mid].y)) + CARD_H / 2 : pB.y + CARD_H / 2;

        const aCenter = (aTopEdge + aBottomEdge) / 2;
        const bCenter = (bTopEdge + bBottomEdge) / 2;
        const y1 = aCenter < bCenter ? aBottomEdge : aTopEdge;
        const y2 = aCenter < bCenter ? bTopEdge : bBottomEdge;
        const x = pA.x + SECTION_W / 2;

        g.append('line')
          .attr('x1', x).attr('y1', y1).attr('x2', x).attr('y2', y2)
          .attr('stroke', '#e65100').attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '5,5').attr('opacity', 0.6);
        g.append('text')
          .attr('x', x + 8).attr('y', (y1 + y2) / 2)
          .attr('text-anchor', 'middle').attr('font-size', '10px')
          .text('💔');
      } else {
        const aLeftEdge = aGrp ? allPos[aGrp.memberIds[0]].x - SECTION_W / 2 : pA.x - SECTION_W / 2;
        const aRightEdge = aGrp ? allPos[aGrp.memberIds[aGrp.size - 1]].x + SECTION_W / 2 : pA.x + SECTION_W / 2;
        const bLeftEdge = bGrp ? allPos[bGrp.memberIds[0]].x - SECTION_W / 2 : pB.x - SECTION_W / 2;
        const bRightEdge = bGrp ? allPos[bGrp.memberIds[bGrp.size - 1]].x + SECTION_W / 2 : pB.x + SECTION_W / 2;

        const aCenter = (aLeftEdge + aRightEdge) / 2;
        const bCenter = (bLeftEdge + bRightEdge) / 2;
        const x1 = aCenter < bCenter ? aRightEdge : aLeftEdge;
        const x2 = aCenter < bCenter ? bLeftEdge : bRightEdge;
        const y = pA.y + CARD_H / 2;

        g.append('line')
          .attr('x1', x1).attr('y1', y).attr('x2', x2).attr('y2', y)
          .attr('stroke', '#e65100').attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '5,5').attr('opacity', 0.6);
        g.append('text')
          .attr('x', (x1 + x2) / 2).attr('y', y - 5)
          .attr('text-anchor', 'middle').attr('font-size', '10px')
          .text('💔');
      }
    });

    // ── Legend ────────────────────────────────────────────
    const legend = svg.append('g').attr('transform', 'translate(14,14)');
    const legendItems = [
      { type: 'group', label: 'Kết hôn / Góa' },
      { type: 'deceased', label: 'Đã mất (xám)' },
      { type: 'divorced', label: 'Ly hôn (tách)' },
      { type: 'explore', label: 'Khám phá nhánh ẩn' },
    ];
    const lW = 180;
    const lH = legendItems.length * 22 + 14;
    legend.append('rect').attr('width', lW).attr('height', lH).attr('rx', 6)
      .attr('fill', 'rgba(255,255,255,.92)').attr('stroke', '#e0e0e0');

    legendItems.forEach((it, i) => {
      const y = i * 22 + 14;
      if (it.type === 'group') {
        legend.append('rect').attr('x', 8).attr('y', y - 6).attr('width', 36).attr('height', 12).attr('rx', 3)
          .attr('fill', '#e3f2fd').attr('stroke', '#9e9e9e').attr('stroke-width', 1);
        legend.append('line').attr('x1', 20).attr('y1', y - 6).attr('x2', 20).attr('y2', y + 6)
          .attr('stroke', '#bdbdbd').attr('stroke-width', 0.5);
        legend.append('line').attr('x1', 32).attr('y1', y - 6).attr('x2', 32).attr('y2', y + 6)
          .attr('stroke', '#bdbdbd').attr('stroke-width', 0.5);
        legend.append('text').attr('x', 20).attr('y', y + 1).attr('text-anchor', 'middle').attr('font-size', '7px').text('❤️');
        legend.append('text').attr('x', 32).attr('y', y + 1).attr('text-anchor', 'middle').attr('font-size', '7px').text('🕊️');
      } else if (it.type === 'deceased') {
        legend.append('rect').attr('x', 8).attr('y', y - 6).attr('width', 36).attr('height', 12).attr('rx', 3)
          .attr('fill', '#cfd8dc').attr('stroke', '#90a4ae').attr('stroke-width', 1).attr('opacity', 0.6);
        legend.append('text').attr('x', 26).attr('y', y + 1).attr('text-anchor', 'middle').attr('font-size', '7px').text('🪦');
      } else if (it.type === 'divorced') {
        legend.append('rect').attr('x', 8).attr('y', y - 6).attr('width', 14).attr('height', 12).attr('rx', 3)
          .attr('fill', '#fce4ec').attr('stroke', '#e65100').attr('stroke-width', 1);
        legend.append('line').attr('x1', 24).attr('y1', y).attr('x2', 38).attr('y2', y)
          .attr('stroke', '#e65100').attr('stroke-width', 1.5).attr('stroke-dasharray', '3,3');
        legend.append('text').attr('x', 31).attr('y', y - 4).attr('text-anchor', 'middle').attr('font-size', '7px').text('💔');
      } else if (it.type === 'explore') {
        legend.append('text').attr('x', 26).attr('y', y + 2).attr('text-anchor', 'middle').attr('font-size', '12px').text('🔍');
      }
      legend.append('text').attr('x', 50).attr('y', y + 3).attr('font-size', '9px').attr('fill', '#424242').text(it.label);
    });

    // ── Auto-fit ─────────────────────────────────────────
    requestAnimationFrame(() => {
      const bbox = g.node().getBBox();
      if (bbox.width === 0 || bbox.height === 0) return;
      const pad = 40;
      const scale = Math.min(
        (width - pad * 2) / bbox.width,
        (height - pad * 2) / bbox.height,
        1.5
      );
      const tx = width / 2 - (bbox.x + bbox.width / 2) * scale;
      const ty = height / 2 - (bbox.y + bbox.height / 2) * scale;
      svg.call(zoomBehavior.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
    });

  }, [members, treeId, activeFilter, viewRootId, effectiveViewMode, d3Layout, buildHierarchy, buildMultiRootHierarchy, getLookup, findCouples, findDefaultRoot, fitToScreen, isAdmin]);

  const viewRootName = (() => {
    if (!viewRootId || !members) return null;
    const m = members.find((x) => x._id === viewRootId);
    if (!m) return null;
    const parts = [m.lastName, m.middleName, m.vnName, m.firstName].filter(Boolean);
    return parts.join(' ');
  })();

  // Get focused member info for generation navigation
  const focusedMember = focusedMemberId ? members.find(m => m._id === focusedMemberId) : null;
  const focusedMemberName = focusedMember ? (() => {
    const parts = [focusedMember.lastName, focusedMember.vnName, focusedMember.firstName].filter(Boolean);
    return parts.join(' ');
  })() : null;

  // Get parent info for navigation
  const getFatherInfo = () => {
    if (!focusedMember) return null;
    const fatherId = typeof focusedMember.fatherId === 'object' ? focusedMember.fatherId?._id : focusedMember.fatherId;
    if (!fatherId) return null;
    const father = members.find(m => m._id === fatherId);
    if (!father) return null;
    const parts = [father.lastName, father.vnName, father.firstName].filter(Boolean);
    return { id: fatherId, name: parts.join(' ') };
  };

  const getMotherInfo = () => {
    if (!focusedMember) return null;
    const motherId = typeof focusedMember.motherId === 'object' ? focusedMember.motherId?._id : focusedMember.motherId;
    if (!motherId) return null;
    const mother = members.find(m => m._id === motherId);
    if (!mother) return null;
    const parts = [mother.lastName, mother.vnName, mother.firstName].filter(Boolean);
    return { id: motherId, name: parts.join(' ') };
  };

  const fatherInfo = getFatherInfo();
  const motherInfo = getMotherInfo();

  // Navigate to parent generation
  const navigateToParent = (parentId) => {
    console.log('navigateToParent called with:', parentId);
    setFocusedMemberId(parentId);
    setViewRootId(parentId);
  };

  // Set focused member when clicking on a member card (to enable generation navigation)
  const handleMemberFocus = (memberId) => {
    setFocusedMemberId(memberId);
  };

  function handleZoomIn() {
    const svg = d3.select(svgRef.current);
    if (zoomRef.current) svg.transition().duration(300).call(zoomRef.current.scaleBy, 1.4);
  }
  function handleZoomOut() {
    const svg = d3.select(svgRef.current);
    if (zoomRef.current) svg.transition().duration(300).call(zoomRef.current.scaleBy, 0.7);
  }

  return (
    <div className="tree-canvas-wrapper" ref={containerRef}>
      {/* Generation Navigation Bar */}
      {focusedMemberId && (fatherInfo || motherInfo) && (
        <div className="generation-nav-bar">
          <div className="gen-nav-current">
            <span>📍 {focusedMemberName}</span>
            <button className="btn btn-outline btn-sm" onClick={() => setFocusedMemberId(null)}>
              ✕
            </button>
          </div>
          <div className="gen-nav-parents">
            <span className="gen-nav-label">⬆️ Thế hệ trước:</span>
            {fatherInfo && (
              <button
                className="btn btn-outline btn-sm gen-nav-btn"
                onClick={() => {
                  console.log('Father button clicked:', fatherInfo.id, fatherInfo.name);
                  navigateToParent(fatherInfo.id);
                }}
              >
                👨 {fatherInfo.name}
              </button>
            )}
            {motherInfo && (
              <button
                className="btn btn-outline btn-sm gen-nav-btn"
                onClick={() => {
                  console.log('Mother button clicked:', motherInfo.id, motherInfo.name);
                  navigateToParent(motherInfo.id);
                }}
              >
                👩 {motherInfo.name}
              </button>
            )}
          </div>
        </div>
      )}

      {viewRootId && viewRootName && (
        <div className="tree-root-banner">
          <span>👑 Đang xem từ: <strong>{viewRootName}</strong></span>
          <button className="btn btn-outline btn-sm" onClick={resetRoot}>
            ↩ Quay về cây đầy đủ
          </button>
        </div>
      )}

      {(!members || members.length === 0) && (
        <div className="empty-tree"><span className="empty-icon">🌱</span><h3>Cây gia phả trống</h3><p>Thêm thành viên đầu tiên để bắt đầu!</p></div>
      )}
      <svg ref={svgRef} className="tree-svg" />
    </div>
  );
}

export default FamilyTreeCanvas;
