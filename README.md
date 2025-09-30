# Layout - Professional Floor Plan Design Platform

> **Built at HackGT**: AI-powered floor plan editor with real-time collaboration and intelligent design assistance.

Layout is a sophisticated web-based floor plan design platform that combines professional CAD-like tools with AI-powered design assistance and Figma-like seamless canvas interactions. Built for architects, designers, and anyone who needs to create detailed architectural layouts with the intuitive usability of modern design tools and the precision of professional software.

## 🌟 Features

### 🎨 Figma-Like Canvas Experience
- **Seamless Interactions**: Smooth zoom, pan, and selection with intuitive mouse and keyboard controls
- **Fluid Design Workflow**: Drag-and-drop functionality with real-time visual feedback
- **Modern UI/UX**: Clean, minimalist interface that gets out of your way
- **Responsive Canvas**: Buttery-smooth performance even with complex floor plans

### 🏗️ Professional Design Tools
- **Precision Drawing**: CAD-like tools with grid snapping and dimensional constraints
- **Intelligent Snapping**: Advanced snap manager for accurate object placement
- **Wall System**: Comprehensive wall creation, editing, and attachment system
- **Rich Icon Library**: 80+ architectural elements including furniture, fixtures, and structural components

### 🤖 AI-Powered Design Assistant
- **Natural Language Commands**: Describe your design intent and let AI create layouts
- **Intelligent Suggestions**: AI agent provides architectural expertise and design recommendations
- **Automated Layout Generation**: Generate room layouts based on requirements and constraints
- **Real-time Chat Integration**: Multiple chat modes (floating, sidebar, embedded) for seamless AI interaction

### 👥 Collaboration & Sharing
- **Real-time Collaboration**: Multi-user editing with live updates
- **Plan Management**: Organize projects with versioning and revision history
- **Secure Sharing**: Role-based permissions and shareable links
- **Cloud Storage**: Persistent storage with Supabase integration

### 🎨 Advanced Canvas Features
- **Konva-powered Rendering**: High-performance 2D canvas with Figma-like smooth interactions
- **Intuitive Multi-Selection**: Click, drag, and marquee select like in modern design tools
- **Smart Layer Management**: Organized layering system with visual hierarchy
- **Real-time Visual Feedback**: Instant preview of changes and hover states
- **Room Detection**: Automatic room boundary detection and area calculations
- **Material System**: Multiple flooring types and surface materials

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** (20.9.0+ recommended for backend)
- **OpenAI API Key** for AI features
- **Supabase Account** for authentication and data storage

### Installation

1. **Clone and setup dependencies:**
```bash
git clone https://github.com/your-username/layout.git
cd layout
npm install
cd src/backend && npm install && cd ../..
```

2. **Environment Configuration:**
Create a `.env` file in the root directory:
```env
# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here

# Supabase Configuration  
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Optional: Custom API endpoints
NEXT_PUBLIC_API_URL=http://localhost:4111
```

3. **Database Setup:**
Set up your Supabase database with the required tables:
- `plans` - Floor plan projects
- `plan_revisions` - Version history
- `plan_members` - Collaboration permissions

4. **Start Development:**
```bash
npm run dev
```

This launches both servers:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4111

## 🏗️ Architecture

### Frontend Stack
- **Next.js 15** - React framework with App Router
- **React 19** - Latest React features and concurrent rendering
- **TypeScript 5** - Full type safety throughout the application
- **Tailwind CSS 4** - Modern utility-first styling
- **Cedar OS** - AI chat interface components
- **Konva/React-Konva** - High-performance 2D canvas rendering
- **Radix UI** - Accessible component primitives
- **Framer Motion** - Smooth animations and interactions

### Backend Stack
- **Mastra Framework** - Agent orchestration and workflow management
- **Node.js 20+** - Runtime environment
- **SQLite** - Local development database
- **OpenAI SDK** - LLM integration for AI features
- **Zod** - Schema validation and type safety

### Key Services
- **Supabase** - Authentication, database, and real-time subscriptions
- **OpenAI** - GPT-4 for architectural design assistance
- **Vercel** - Deployment and hosting (recommended)

## 📁 Project Structure

```
layout/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── components/         # React components
│   │   ├── plans/             # Floor plan management pages
│   │   ├── auth/              # Authentication pages
│   │   └── lib/               # Client-side utilities
│   ├── backend/               # Mastra backend
│   │   └── src/mastra/        # Agents, workflows, and tools
│   ├── cedar/                 # Cedar OS components
│   ├── components/            # Shared React components
│   ├── hooks/                 # Custom React hooks
│   ├── managers/              # Canvas interaction managers
│   └── utils/                 # Utility functions
├── public/
│   └── icons/                 # SVG icon library
│       ├── foundational/      # Walls, doors, windows
│       └── furniture/         # Furniture and fixtures
└── ...config files
```

## 🎯 Core Components

### Canvas System
- **KonvaCanvas**: Main drawing surface with Figma-inspired zoom, pan, and selection
- **SelectionManager**: Intuitive multi-object selection with visual feedback
- **SnapManager**: Smart snapping system that feels natural and responsive  
- **WallManager**: Fluid wall creation and editing with real-time preview
- **CollisionManager**: Intelligent collision detection with visual cues
- **InteractionManager**: Seamless mouse and keyboard interactions

### AI Integration
- **FloorPlanAgent**: Architectural expert AI with design knowledge
- **FloorPlanWorkflow**: Multi-step design process automation
- **Chat Components**: Multiple UI modes for AI interaction

### Data Management
- **Plan Management**: CRUD operations for floor plan projects
- **Revision System**: Version control and collaboration features
- **Real-time Sync**: Live updates across multiple users

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev          # Start both frontend and backend
npm run dev:next     # Frontend only
npm run dev:mastra   # Backend only

# Production
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # ESLint checking
npm run pretty       # Prettier formatting
```

### Adding New Features

#### New Furniture/Icons
1. Add SVG files to `public/icons/furniture/`
2. Update icon registry in floor plan agent
3. Add to item type definitions

#### New AI Capabilities
1. Extend `floorPlanTools.ts` with new functions
2. Update agent prompt in `floorPlanAgent.ts`
3. Add workflow steps in `floorPlanWorkflow.ts`

#### New Canvas Features
1. Create manager in `src/managers/`
2. Integrate with `KonvaCanvas.tsx`
3. Add UI controls in plan editor

### Testing

```bash
# Run linting
npm run lint

# Manual testing checklist
- [ ] Canvas interactions (zoom, pan, select)
- [ ] Wall creation and editing
- [ ] Object placement and snapping
- [ ] AI chat functionality
- [ ] Plan save/load operations
- [ ] Multi-user collaboration
```

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main

### Manual Deployment
```bash
# Build the application
npm run build

# Deploy frontend
npm run start

# Deploy backend separately
cd src/backend
npm run build
npm run start
```

### Environment Variables
Ensure all required environment variables are set in production:
- OpenAI API key for AI features
- Supabase credentials for data and auth
- Any custom API endpoints

## 🤝 Contributing

### Development Workflow
1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Code Standards
- **TypeScript**: Use strict typing, avoid `any`
- **Prettier**: 2-space indentation, single quotes, trailing commas
- **ESLint**: Follow React and Next.js best practices
- **Commits**: Use conventional commit format

### Testing Guidelines
- Test all canvas interactions
- Verify AI functionality with various prompts
- Check responsive design across devices
- Validate collaboration features

## 📚 API Documentation

### Chat Endpoints

#### Execute AI Function
```http
POST /chat/execute-function
Content-Type: application/json

{
  "prompt": "Create a 3-bedroom apartment layout",
  "temperature": 0.7,
  "maxTokens": 1000,
  "systemPrompt": "You are an expert architect..."
}
```

#### Streaming Chat
```http
POST /chat/execute-function/stream
Content-Type: application/json

{
  "prompt": "Design a kitchen with an island",
  "temperature": 0.7
}
```

Returns Server-Sent Events with design updates and streaming responses.

## 🔧 Configuration

### Tailwind CSS
Custom configuration in `tailwind.config.js`:
- Design system colors and spacing
- Custom animations and effects
- Blueprint grid patterns

### TypeScript
Strict configuration in `tsconfig.json`:
- Path mapping for clean imports
- Strict type checking enabled
- Modern ES features support
## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Cedar OS** - AI interface components
- **Mastra** - Backend agent framework
- **Konva** - 2D canvas library
- **Supabase** - Backend-as-a-Service
- **OpenAI** - AI language models
- **Radix UI** - Accessible components
- **Tailwind CSS** - Utility-first CSS framework

---
**Built with ❤️ at HackGT** 