# 🌳 Family Tree — Interactive Family Tree Web Application

A full-stack interactive family tree builder using **React.js**, **Node.js/Express**, **MongoDB**, and **Facebook OAuth** authentication.

![Tech Stack](https://img.shields.io/badge/React-18-blue) ![Node.js](https://img.shields.io/badge/Node.js-Express-green) ![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-brightgreen) ![Auth](https://img.shields.io/badge/Auth-Facebook_OAuth-blue)

## Features

- 🔐 **Facebook OAuth** — Sign in with your Facebook account
- 🌳 **Interactive Tree Visualization** — D3.js-powered family tree with zoom, pan, and drag
- 👨‍👩‍👧‍👦 **Family Member Management** — Add, edit, delete members with detailed profiles
- 🔗 **Relationship Linking** — Parent-child and spouse connections with visual links
- 🖱️ **Drag & Drop** — Reposition family member cards on the canvas
- 📱 **Responsive Design** — Works on desktop and mobile
- 🎨 **Gender-coded Cards** — Blue for male, pink for female, neutral for other

## Project Structure

```
Fam-Tree/
├── client/                 # React Frontend
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── FamilyTreeCanvas.js   # D3.js interactive tree
│   │   │   ├── MemberDetail.js       # Side panel member info
│   │   │   ├── MemberModal.js        # Add/Edit member form
│   │   │   └── Navbar.js             # Top navigation bar
│   │   ├── context/
│   │   │   └── AuthContext.js        # Auth state management
│   │   ├── pages/
│   │   │   ├── Dashboard.js          # Tree list / home page
│   │   │   ├── LoginPage.js          # Facebook login page
│   │   │   └── TreeView.js           # Tree viewer/editor page
│   │   ├── styles/
│   │   │   └── global.css            # All styles
│   │   ├── api.js                    # API helper functions
│   │   ├── App.js                    # Root component with routing
│   │   └── index.js                  # Entry point
│   └── package.json
├── server/                 # Node.js Backend
│   ├── config/
│   │   ├── db.js                     # MongoDB connection
│   │   └── passport.js               # Facebook OAuth strategy
│   ├── middleware/
│   │   └── auth.js                   # Auth middleware
│   ├── models/
│   │   ├── FamilyMember.js           # Member schema
│   │   ├── FamilyTree.js             # Tree schema
│   │   └── User.js                   # User schema
│   ├── routes/
│   │   ├── auth.js                   # Auth routes (/api/auth/*)
│   │   └── trees.js                  # Tree & member CRUD (/api/trees/*)
│   ├── .env                          # Environment variables
│   ├── index.js                      # Express server entry
│   └── package.json
├── .gitignore
├── package.json            # Root scripts (dev, install-all)
└── README.md
```

## Prerequisites

- **Node.js** ≥ 18
- **MongoDB** (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- **Facebook Developer App** with OAuth configured

## Setup

### 1. Clone & Install

```bash
cd Fam-Tree
npm run install-all
```

### 2. Create a Facebook App

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps)
2. Create a new app → Select **Consumer** type
3. Add **Facebook Login** product
4. In Facebook Login → Settings:
   - Add `http://localhost:5000/api/auth/facebook/callback` as a **Valid OAuth Redirect URI**
5. In App Settings → Basic:
   - Copy your **App ID** and **App Secret**

### 3. Configure Environment Variables

Edit `server/.env`:

```env
MONGO_URI=mongodb://localhost:27017/familytree
SESSION_SECRET=any-random-string-here

FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_CALLBACK_URL=http://localhost:5000/api/auth/facebook/callback

CLIENT_URL=http://localhost:3000
PORT=5000
```

### 4. Start MongoDB

```bash
# If using local MongoDB:
mongod

# Or use MongoDB Atlas and update MONGO_URI in .env
```

### 5. Run the Application

```bash
# Run both server & client concurrently:
npm run dev

# Or run separately:
npm run server:dev   # Backend on :5000
npm run client       # Frontend on :3000
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/facebook` | Initiate Facebook OAuth |
| GET | `/api/auth/facebook/callback` | OAuth callback |
| GET | `/api/auth/current-user` | Get logged-in user |
| GET | `/api/auth/logout` | Log out |

### Family Trees
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trees` | Get all user's trees |
| POST | `/api/trees` | Create a new tree |
| GET | `/api/trees/:id` | Get tree with members |
| PUT | `/api/trees/:id` | Update tree |
| DELETE | `/api/trees/:id` | Delete tree & members |

### Family Members
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/trees/:treeId/members` | Add member |
| PUT | `/api/trees/:treeId/members/:id` | Update member |
| DELETE | `/api/trees/:treeId/members/:id` | Delete member |
| PUT | `/api/trees/:treeId/members/:id/position` | Update position |

## Usage

1. **Login** — Click "Continue with Facebook" to sign in
2. **Create a Tree** — Click "+ New Family Tree" on the dashboard
3. **Add Members** — Click "+ Add Member" or the `+` button on any card to add a child
4. **View Details** — Click any member card to see their profile in the side panel
5. **Edit/Delete** — Use the side panel buttons to edit or remove members
6. **Navigate** — Scroll to zoom, drag the canvas to pan, drag cards to reposition

## License

MIT
