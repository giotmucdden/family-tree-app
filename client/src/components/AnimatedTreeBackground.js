import React, { useEffect, useRef } from 'react';

function AnimatedTreeBackground({ darkMode = false }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Tree nodes (family member circles)
    const nodes = [];
    const connections = [];
    const particles = [];
    const NUM_NODES = 18;
    const NUM_PARTICLES = 40;

    // Generate tree-like structure
    function generateTree() {
      nodes.length = 0;
      connections.length = 0;

      // Root node at top center
      const rootX = width * 0.5;
      const rootY = height * 0.12;
      nodes.push({
        x: rootX, y: rootY,
        targetX: rootX, targetY: rootY,
        radius: 18,
        generation: 0,
        opacity: 0,
        targetOpacity: 0.6,
        pulsePhase: Math.random() * Math.PI * 2,
        color: darkMode ? 'rgba(100, 181, 246, 0.5)' : 'rgba(99, 102, 241, 0.4)',
      });

      // Generate generations
      let currentGen = [0];
      let genY = rootY;
      const genGap = height * 0.18;

      for (let gen = 1; gen <= 3; gen++) {
        genY += genGap;
        const nextGen = [];
        const childrenPerParent = gen === 1 ? 3 : 2;
        const totalChildren = currentGen.length * childrenPerParent;
        const spacing = width / (totalChildren + 1);

        let childIdx = 0;
        for (const parentIdx of currentGen) {
          for (let c = 0; c < childrenPerParent; c++) {
            if (nodes.length >= NUM_NODES) break;
            childIdx++;
            const cx = spacing * childIdx + (Math.random() - 0.5) * spacing * 0.3;
            const cy = genY + (Math.random() - 0.5) * 20;
            const nodeIdx = nodes.length;
            nodes.push({
              x: cx, y: cy,
              targetX: cx, targetY: cy,
              radius: 14 - gen * 2,
              generation: gen,
              opacity: 0,
              targetOpacity: 0.4 - gen * 0.05,
              pulsePhase: Math.random() * Math.PI * 2,
              color: darkMode
                ? `rgba(${130 + gen * 30}, ${180 + gen * 15}, 246, ${0.4 - gen * 0.05})`
                : `rgba(99, 102, 241, ${0.35 - gen * 0.05})`,
            });
            connections.push({ from: parentIdx, to: nodeIdx, opacity: 0, targetOpacity: 0.25 });
            nextGen.push(nodeIdx);
          }
        }
        currentGen = nextGen;
      }
    }

    // Generate floating particles
    function generateParticles() {
      particles.length = 0;
      for (let i = 0; i < NUM_PARTICLES; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          radius: Math.random() * 2 + 0.5,
          opacity: Math.random() * 0.3 + 0.1,
        });
      }
    }

    generateTree();
    generateParticles();

    let time = 0;

    function animate() {
      time += 0.008;
      ctx.clearRect(0, 0, width, height);

      // Animate particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = darkMode
          ? `rgba(148, 163, 184, ${p.opacity})`
          : `rgba(255, 255, 255, ${p.opacity * 1.5})`;
        ctx.fill();
      }

      // Animate connections (draw curved lines like tree branches)
      for (const conn of connections) {
        conn.opacity += (conn.targetOpacity - conn.opacity) * 0.02;
        const from = nodes[conn.from];
        const to = nodes[conn.to];

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);

        // Curved connection
        const midY = (from.y + to.y) / 2;
        ctx.bezierCurveTo(
          from.x, midY,
          to.x, midY,
          to.x, to.y
        );

        ctx.strokeStyle = darkMode
          ? `rgba(100, 181, 246, ${conn.opacity * 0.6})`
          : `rgba(99, 102, 241, ${conn.opacity * 0.5})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Animate nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        node.opacity += (node.targetOpacity - node.opacity) * 0.015;

        // Gentle floating motion
        const floatX = Math.sin(time + node.pulsePhase) * 3;
        const floatY = Math.cos(time * 0.7 + node.pulsePhase) * 2;
        const drawX = node.targetX + floatX;
        const drawY = node.targetY + floatY;
        node.x = drawX;
        node.y = drawY;

        // Pulsing glow
        const pulse = Math.sin(time * 1.5 + node.pulsePhase) * 0.15 + 0.85;
        const r = node.radius * pulse;

        // Outer glow
        const gradient = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, r * 2.5);
        if (darkMode) {
          gradient.addColorStop(0, `rgba(100, 181, 246, ${node.opacity * 0.3})`);
          gradient.addColorStop(1, 'rgba(100, 181, 246, 0)');
        } else {
          gradient.addColorStop(0, `rgba(99, 102, 241, ${node.opacity * 0.25})`);
          gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
        }
        ctx.beginPath();
        ctx.arc(drawX, drawY, r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Inner circle
        ctx.beginPath();
        ctx.arc(drawX, drawY, r, 0, Math.PI * 2);
        ctx.fillStyle = darkMode
          ? `rgba(100, 181, 246, ${node.opacity * 0.5})`
          : `rgba(99, 102, 241, ${node.opacity * 0.4})`;
        ctx.fill();

        // Ring
        ctx.beginPath();
        ctx.arc(drawX, drawY, r, 0, Math.PI * 2);
        ctx.strokeStyle = darkMode
          ? `rgba(148, 163, 184, ${node.opacity * 0.4})`
          : `rgba(255, 255, 255, ${node.opacity * 0.5})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [darkMode]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}

export default AnimatedTreeBackground;
