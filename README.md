# Career Assistant Platform

A modern career development platform built with Astro, TypeScript, and Firebase, designed to streamline your job search process. Our platform combines professional resume building, intelligent job tracking, and comprehensive career tools in one seamless experience.

## 🌟 Current Features

### Professional Resume Builder
- **Intuitive Resume Creator**: Our user-friendly interface guides you through creating a professional resume with structured sections for experience, education, skills, and more
- **Curated Templates**: Choose from our handpicked collection of ATS-friendly, professional resume templates designed for various industries
- **Rich Text Formatting**: Format your content with essential styling options including bold, italic, bullet points, and section headers
- **Document Management**: Securely save your resumes to your account and access them anytime for updates or revisions

### Dynamic Cover Letter Tools
- **Structured Builder**: Create compelling cover letters using our step-by-step builder that guides you through essential sections
- **Template Library**: Access our collection of professional cover letter templates designed to match our resume styles
- **Custom Formatting**: Personalize your cover letter with professional formatting options while maintaining consistency
- **Real-time Preview**: See exactly how your cover letter will look as you type with our side-by-side preview feature

### Comprehensive Job Tracker
- **Visual Dashboard**: Monitor your job search progress through an organized, visual dashboard
- **Application Pipeline**: Track applications through different stages - Saved, Applied, Interview, Offer, and more
- **Detailed Notes System**: Record important details including interview notes, follow-up dates, and contact information
- **Search & Filter**: Easily find specific applications with our search and filter functionality

### Job Analysis Tools
- **Requirements Analyzer**: Extract and organize key job requirements from posted descriptions
- **Skills Assessment**: Compare job requirements against your profile to identify matches and gaps
- **Qualification Tracking**: Keep track of required qualifications and certifications for different roles

### Powerful User Features
- **Profile Management**: Create and maintain your professional profile with detailed information
- **Cloud Storage**: Securely store and organize all your career documents in one place
- **Preference Settings**: Customize your experience with personalized settings for notifications and display options

### Robust Platform Features
- **Secure Authentication**: Firebase-powered secure login and signup system with email verification
- **Account Recovery**: Streamlined password recovery process with email-based verification
- **Unified Dashboard**: Access all tools and features through an intuitive, centralized dashboard
- **Comprehensive Help Center**: Detailed documentation, tooltips, and guides for all platform features

### Modern Technical Foundation
- **Performance-Focused**: Built with Astro for optimal loading speeds and performance
- **Type-Safe Development**: Implemented with TypeScript for enhanced reliability
- **Responsive Interface**: Fully responsive design that works seamlessly across desktop and mobile devices
- **Dark Mode Support**: Thoughtfully designed dark mode that reduces eye strain during night-time use
- **Security First**: Robust authentication and data protection powered by Firebase

## Coming Soon
- **AI Enhancement Suite**: Smart content suggestions and formatting recommendations
- **Advanced Document Management**: Version control and document comparison features
- **Market Intelligence**: Company research tools and salary insights database
- **Premium Support System**: Priority support channels and expert resume review services
- **Advanced Formatting Lab**: Enhanced customization options for documents
- **Collaboration Features**: Share and receive feedback on your documents
- **Analytics Dashboard**: Detailed insights about your job search progress
- **Job Board Integration**: Direct application capabilities with major job boards

## Getting Started
Begin your professional journey by creating an account through our secure signup process. Once logged in, you'll have immediate access to our suite of career tools. Our comprehensive help documentation will guide you through making the most of each feature.

Visit our [login](/login) or [signup](/signup) page to get started. Need help? Check out our [documentation](/help) for detailed guides and tips.

## 🎯 Core Features

### 1. Resume Architect (`/components/tools/Resume.astro`, `/components/tools/ResumeManager.astro`)

#### Key Features
- **AI-Powered Content Generation**: Real-time streaming content generation with custom formatting
- **Template Management**: Multiple professional templates with customizable sections
- **Version History**: Automatic saving and version tracking in Firebase
- **Resume Import**: Import existing resumes from Firebase storage

#### Technical Implementation
```typescript
// Firebase Integration
- PersistentDocumentService for version control
- Firestore for data persistence
- Real-time content streaming with SSE

// Features
- Custom template system with dynamic sections
- Real-time content validation and formatting
- Automatic progress saving
```

### 2. Job Analysis Engine (`/components/tools/JobAnalysis.astro`)

#### Key Features
- **Comprehensive Analysis**: Detailed job role breakdown
- **Compensation Analysis**: Salary ranges and benefits evaluation
- **Company Culture Insights**: Work environment assessment
- **Market Position**: Industry trends and company standing

#### Technical Implementation
```typescript
// Data Structure
- Job Role Summary
  - Seniority Level
  - Key Responsibilities
  - Reporting Structure
  - Team Size

// Analysis Components
- Skills Assessment
- Compensation Details
- Growth Opportunities
- Application Strategy
```

### 3. Cover Letter Generator (`/components/tools/CoverLetter.astro`)

#### Key Features
- **Multiple Templates**: Professional, Creative, Technical, and Executive styles
- **Real-time Preview**: Live content generation with streaming updates
- **Resume Integration**: Direct import from saved resumes
- **Custom Instructions**: Personalized tone and content guidance

#### Technical Implementation
```typescript
// Template System
const coverLetterTemplates = [
  {
    id: 'professional',
    name: 'Professional',
    promptModifier: 'formal, business-oriented'
  },
  {
    id: 'creative',
    name: 'Creative',
    promptModifier: 'innovative, engaging'
  }
]

// Features
- Streaming content generation
- Format preservation
- Custom styling options
```

### 4. Job Application Tracker (`/components/tools/JobTrackerComponent.astro`)

#### Key Features
- **Application Pipeline**: Visual status tracking
- **Rich Job Details**: Company, position, and application date
- **Notes Management**: Personal notes and follow-ups
- **Timeline View**: Chronological application history

#### Technical Implementation
```typescript
// Firestore Schema
interface Job {
  id: string;
  company: string;
  position: string;
  status: string;
  dateApplied: Timestamp;
  url?: string;
  jobDescription?: string;
  notes?: string;
  createdAt: Timestamp;
}

// Features
- Real-time updates with Firestore
- Drag-and-drop status updates
- Automatic date tracking
```

## 🛠️ Technology Stack

### Frontend
- **Framework**: Astro 5.1.9
- **UI Components**: Custom Tailwind components
- **State Management**: Firebase real-time updates

### Backend
- **Server**: Astro SSR with API routes
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth with Google provider
- **Storage**: Firebase Storage for documents

### AI Integration
- **Content Generation**: Streaming API integration
- **Analysis**: Custom NLP pipeline
- **Data Processing**: Server-side analysis tools

## 💳 Payment Integration

### Razorpay Implementation
```typescript
// API Routes
- /api/create-payment-link: Secure payment initialization
- /api/razorpay-webhook: Event handling and verification
```

## 🔐 Security Features

- **Authentication**: Firebase Auth with session management
- **API Security**: Request validation and rate limiting
- **Data Access**: Firestore security rules
- **Input Sanitization**: Server-side validation

## 🚀 Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Configure environment:
   ```env
   FIREBASE_API_KEY=your_key
   RAZORPAY_KEY_ID=your_key
   RAZORPAY_SECRET=your_secret
   ```
4. Start development: `npm run dev`

## 📚 API Documentation

API documentation and examples available in `/docs/api`

## 🤝 Contributing

We welcome contributions! See CONTRIBUTING.md for guidelines.

## 📝 License

MIT License - see LICENSE for details

```
/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   └── Card.astro
│   ├── layouts/
│   │   └── Layout.astro
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                | Action                                             |
| :--------------------- | :------------------------------------------------- |
| `npm install`          | Installs dependencies                              |
| `npm run dev`          | Starts local dev server at `localhost:3000`        |
| `npm run build`        | Build your production site to `./dist/`            |
| `npm run preview`      | Preview your build locally, before deploying       |
| `npm run astro ...`    | Run CLI commands like `astro add`, `astro preview` |
| `npm run astro --help` | Get help using the Astro CLI                       |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
