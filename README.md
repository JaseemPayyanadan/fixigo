# Fixigo - Service Management Platform

A modern, full-stack service management application built with Next.js 15, TypeScript, and Firebase.

## 🚀 Features

- **Multi-role Authentication**: Shop admins, branch admins, and technicians
- **Service Management**: Create, track, and manage service requests
- **Technician Management**: Assign and manage technical staff
- **Branch Management**: Manage multiple business locations
- **Invoice Generation**: Create and track invoices
- **Task Management**: Assign and track tasks for technicians
- **Real-time Updates**: Live updates using Firebase
- **PWA Support**: Progressive Web App capabilities
- **Responsive Design**: Mobile-first responsive design

## 🏗️ Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication route group
│   │   ├── login/               # Login page
│   │   ├── register/            # Registration page
│   │   └── shop-onboarding/     # Shop onboarding
│   ├── (dashboard)/             # Dashboard route group
│   │   ├── dashboard/           # Main dashboard
│   │   ├── services/            # Service management
│   │   ├── technicians/         # Technician management
│   │   ├── branch/              # Branch management
│   │   ├── invoices/            # Invoice management
│   │   ├── my-tasks/            # Task management
│   │   └── profile/             # User profile
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home page
├── components/                   # Reusable components
│   ├── auth/                    # Authentication components
│   │   ├── AuthGuard.tsx       # Route protection
│   │   └── RoleGuard.tsx       # Role-based access
│   ├── layout/                  # Layout components
│   │   ├── AppBar.tsx          # Top navigation bar
│   │   ├── SideNavBar.tsx      # Side navigation
│   │   └── BottomNavBar.tsx    # Mobile navigation
│   ├── ui/                      # UI components
│   │   ├── Button.tsx          # Button component
│   │   ├── TextInput.tsx       # Input component
│   │   ├── LoadingSpinner.tsx  # Loading component
│   │   └── table.tsx           # Table components
│   └── providers.tsx            # Context providers
├── contexts/                    # React contexts
│   ├── AuthContext.tsx         # Authentication state
│   └── SidebarContext.tsx      # Sidebar state
├── hooks/                       # Custom React hooks
│   ├── useAuth.ts              # Authentication hook
│   ├── useUser.ts              # User data hook
│   ├── useBranches.ts          # Branch data hook
│   ├── useTechnicians.ts       # Technician data hook
│   ├── useFirestore.ts         # Firestore hook
│   ├── useLocalStorage.ts      # Local storage hook
│   ├── useDebounce.ts          # Debounce hook
│   └── useClickOutside.ts      # Click outside hook
├── lib/                         # Utility libraries
│   ├── firebase.ts             # Firebase configuration
│   ├── utils.ts                # Utility functions
│   └── constants.ts            # Application constants
├── modules/                     # Feature modules
│   ├── branch/                 # Branch management
│   ├── service/                # Service management
│   └── technician/             # Technician management
└── types/                       # TypeScript types
    └── index.ts                # Type definitions
```

## 🛠️ Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **PWA**: next-pwa
- **Icons**: React Icons
- **State Management**: React Context + Custom Hooks

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd fixigo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your Firebase configuration:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📱 Features by Role

### Shop Administrator
- Manage multiple branches
- Create and manage technicians
- View all services and invoices
- Access to all features

### Branch Administrator
- Manage technicians in their branch
- Create and manage services
- Generate invoices
- Limited to their branch

### Technician
- View assigned tasks
- Update service status
- Access to personal profile
- Limited to assigned services

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run deploy` - Deploy to Firebase

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Next.js recommended rules
- **Prettier**: Automatic code formatting
- **Conventional Commits**: For commit messages

### File Naming Conventions

- **Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useAuth.ts`)
- **Utilities**: camelCase (e.g., `utils.ts`)
- **Types**: PascalCase (e.g., `User.ts`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_ENDPOINTS`)

## 🚀 Deployment

### Firebase Hosting

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Deploy to Firebase**
   ```bash
   npm run deploy
   ```

### Environment Variables

Make sure to set up the following environment variables in your deployment platform:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@fixigo.com or create an issue in the repository.

---

Built with ❤️ using Next.js and Firebase
