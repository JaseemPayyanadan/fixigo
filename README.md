# Fixigo - Professional Service Management System

A comprehensive service management system built with Next.js 14, TypeScript, Tailwind CSS, and Firebase, designed for service businesses with multiple branches and technicians.

## 🚀 Features

### **Role-Based Access Control (RBAC)**
- **Shop Admin**: Full access to shop and all branches
- **Branch Admin**: Access only to assigned branch
- **Technician**: Access only to assigned branch

### **Core Modules**
- **Branch Management**: Create and manage business locations
- **Technician Management**: Manage technicians with skills and availability
- **Service Management**: Track service requests and progress
- **Invoice Management**: Generate and manage invoices
- **Task Management**: Assign and track tasks
- **Dashboard Analytics**: Real-time statistics and reports

### **Professional Architecture**
- Hierarchical data structure with subcollections
- Comprehensive security rules
- Type-safe development with TypeScript
- Modern UI with Tailwind CSS
- Real-time data synchronization

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── (auth)/            # Authentication pages
│   └── (dashboard)/       # Dashboard pages
├── components/             # Reusable React components
│   ├── auth/              # Authentication components
│   ├── layout/            # Layout components
│   └── ui/                # UI components
├── contexts/              # React contexts
├── hooks/                 # Custom React hooks
├── lib/                   # Utility libraries
├── modules/               # Feature-specific modules
└── types/                 # TypeScript type definitions
```

## 📊 Data Structure

### **Collections**
```
/users/{userId} - User profiles and authentication
/shops/{shopId} - Shop information
/shops/{shopId}/branches/{branchId} - Branches under shops
/shops/{shopId}/branches/{branchId}/technicians/{technicianId} - Technicians under branches
/shops/{shopId}/branches/{branchId}/services/{serviceId} - Services under branches
/shops/{shopId}/branches/{branchId}/invoices/{invoiceId} - Invoices under branches
/shops/{shopId}/branches/{branchId}/tasks/{taskId} - Tasks under branches
```

## 🛠️ Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Firebase Firestore, Firebase Auth
- **Deployment**: Vercel, Firebase Hosting
- **State Management**: React Context, Custom Hooks
- **Form Handling**: React Hook Form
- **Validation**: Custom validation with TypeScript

## 🚀 Getting Started

### **Prerequisites**
- Node.js 18+ 
- npm or yarn
- Firebase project

### **Installation**

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd fixigo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   - Create a Firebase project
   - Enable Firestore and Authentication
   - Copy your Firebase config to `src/lib/firebase.ts`

4. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Add your Firebase configuration:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

5. **Deploy Firestore rules**
   ```bash
   firebase deploy --only firestore:rules
   ```

6. **Run the development server**
   ```bash
   npm run dev
   ```

## 🔐 Security

### **Firestore Security Rules**
- Role-based access control
- Data validation and sanitization
- Rate limiting to prevent abuse
- Hierarchical permissions

### **Authentication**
- Firebase Authentication
- Email/password authentication
- Role-based user management
- Secure session handling

## 📱 Features Overview

### **Dashboard**
- Real-time statistics
- Recent activities
- Performance metrics
- Quick actions

### **Branch Management**
- Create and manage branches
- Assign branch managers
- Track branch performance
- Branch-specific settings

### **Technician Management**
- Technician profiles with skills
- Availability tracking
- Performance metrics
- Service history

### **Service Management**
- Service request tracking
- Status updates
- Customer information
- Service history

### **Invoice Management**
- Generate invoices
- Payment tracking
- Tax calculations
- Payment methods

### **Task Management**
- Task assignment
- Priority levels
- Due date tracking
- Progress monitoring

## 🎨 UI Components

### **Built-in Components**
- Responsive layout components
- Form components with validation
- Data tables with sorting/filtering
- Loading states and error handling
- Modal dialogs and notifications

### **Design System**
- Consistent color scheme
- Typography hierarchy
- Component variants
- Responsive design

## 🔧 Development

### **Available Scripts**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript check
```

### **Code Quality**
- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Husky for git hooks

## 📈 Performance

### **Optimizations**
- Next.js App Router for better performance
- Image optimization
- Code splitting
- Lazy loading
- Firebase offline support

### **Monitoring**
- Error tracking
- Performance monitoring
- User analytics
- Real-time logging

## 🚀 Deployment

### **Vercel Deployment**
1. Connect your GitHub repository to Vercel
2. Configure environment variables
3. Deploy automatically on push

### **Firebase Deployment**
```bash
firebase deploy
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the documentation in `PROFESSIONAL_STRUCTURE.md`
- Review the code examples
- Open an issue on GitHub

## 🔄 Version History

- **v2.0.0**: Professional structure with RBAC
- **v1.0.0**: Initial release

---

Built with ❤️ using Next.js, TypeScript, and Firebase
