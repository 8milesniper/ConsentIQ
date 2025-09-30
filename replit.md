# Overview

ConsentIQ is a full-stack web application designed for managing video consent workflows with a subscription-based business model. The platform enables authorized users to create consent sessions, generate QR codes for participant access, capture video consent recordings, and track consent status throughout the process. The application features Stripe-powered subscriptions at $40/month and $400/year, secure video handling, user authentication, and comprehensive consent management with configurable data retention policies.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **UI Library**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with custom design tokens and responsive layouts
- **State Management**: TanStack Query for server state and custom hooks for local state
- **Routing**: Wouter for client-side routing with protected route patterns
- **Forms**: React Hook Form with Zod validation schemas

## Backend Architecture
- **Runtime**: Node.js with Express.js REST API
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: JWT-based authentication with HTTP-only cookies for security
- **File Structure**: Monorepo structure with shared schema definitions between client and server

## Database Design
- **Users Table**: Stores user credentials with bcrypt password hashing, Stripe customer and subscription tracking fields
- **Consent Sessions Table**: Tracks consent workflow state, participant information, QR codes, and retention policies
- **Video Assets Table**: Manages video metadata, storage keys, encryption status, and file integrity checksums
- **Enums**: PostgreSQL enums for consent status (pending, granted, denied, revoked)

## Subscription System
- **Payment Gateway**: Stripe integration for secure payment processing
- **Subscription Tiers**: Monthly ($40/month) and Annual ($400/year) plans with $80 annual savings
- **Checkout Flow**: Seamless registration-to-subscription flow with plan selection preserved through auth
- **Stripe Elements**: Embedded payment form with customized theming for consistent brand experience
- **Webhook Integration**: Real-time subscription status updates via Stripe webhooks
- **Customer Management**: Automatic Stripe customer creation and subscription tracking in user records

## Authentication & Security
- **Password Security**: bcrypt hashing with salt rounds for password storage
- **Session Management**: JWT tokens stored in secure HTTP-only cookies
- **CORS**: Configured for credential inclusion across client-server communication
- **Environment Variables**: Secure configuration management for JWT secrets and database credentials

## Video Processing Pipeline
- **Upload Flow**: Pre-signed URL generation for secure direct video uploads
- **Metadata Extraction**: Automatic capture of file size, duration, resolution, and MIME type validation
- **Storage Security**: Encrypted storage with integrity verification via checksums
- **Retention Management**: Configurable data retention periods with automatic cleanup workflows

## API Design Patterns
- **RESTful Endpoints**: Standard HTTP methods with consistent error handling
- **Type Safety**: Shared Zod schemas between frontend and backend for validation
- **Middleware**: Cookie parsing, request logging, and authentication middleware
- **Error Handling**: Structured error responses with appropriate HTTP status codes

# External Dependencies

## Core Technologies
- **Database**: PostgreSQL (configured for Neon serverless in production)
- **ORM**: Drizzle Kit for migrations and schema management
- **Authentication**: JSON Web Tokens (jsonwebtoken library)
- **Password Hashing**: bcryptjs for secure password storage
- **Payment Processing**: Stripe for subscription management and recurring billing

## UI & Frontend Libraries
- **Component Library**: Radix UI primitives for accessible components
- **Styling**: Tailwind CSS with PostCSS processing
- **Icons**: Lucide React for consistent iconography
- **QR Codes**: qrcode library for generating participant access codes

## Development Tools
- **Build Tool**: Vite with React plugin and TypeScript support
- **Code Quality**: ESBuild for production bundling
- **Development**: tsx for TypeScript execution in development
- **Replit Integration**: Specialized plugins for Replit development environment

## Validation & Type Safety
- **Schema Validation**: Zod for runtime type checking and API validation
- **Form Validation**: @hookform/resolvers for form schema integration
- **TypeScript**: Strict type checking with path mapping for clean imports

## Potential Future Integrations
- **Cloud Storage**: AWS S3 or similar for scalable video storage
- **CDN**: Content delivery network for optimized video streaming
- **Email Services**: SMTP integration for consent notifications
- **Analytics**: User interaction tracking and consent workflow analytics