# DevConnect

![DevConnect Logo](https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png)

## 🚀 Overview

DevConnect is a comprehensive social platform built specifically for developers. It provides a space for tech professionals to connect, share knowledge, ask questions, and build their professional network.

## ✨ Features

- **Social Feed**: Share posts, code snippets, images, and blogs with the developer community
- **Developer Reels**: Short-form video content for sharing coding tips, tutorials, and tech insights
- **Q&A Platform**: Ask technical questions and get answers from the community
- **Job Board**: Browse and post job opportunities in the tech industry
- **Real-time Chat**: Connect with other developers through direct and group messaging
- **Stories**: Share ephemeral content that disappears after 24 hours
- **User Profiles**: Showcase your skills, tech stack, and professional experience

## 🛠️ Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **State Management**: Zustand
- **UI Components**: Custom components with Lucide React icons
- **Code Editing**: Monaco Editor
- **Content Editing**: TipTap, React Markdown

## 📋 Prerequisites

- Node.js (v16+)
- npm or yarn
- Supabase account

## 🔧 Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/devconnect.git
   cd devconnect
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## 🏗️ Project Structure

```
devconnect/
├── public/             # Static assets
├── src/
│   ├── components/     # Reusable UI components
│   ├── contexts/       # React context providers
│   ├── hooks/          # Custom React hooks
│   ├── layouts/        # Page layout components
│   ├── lib/            # Utility libraries
│   ├── pages/          # Page components
│   └── utils/          # Helper functions
├── supabase/
│   ├── functions/      # Edge functions
│   └── migrations/     # Database migrations
└── ...
```

## 🔒 Authentication

DevConnect uses Supabase Auth for user authentication, supporting:
- Email/password authentication
- Profile management
- Role-based access control

## 💾 Database Schema

The application uses a PostgreSQL database with the following main tables:
- `profiles`: Extended user information
- `posts`: All types of posts (text, image, code, blog)
- `comments`: Post comments
- `likes`: Post/comment likes
- `follows`: User following relationships
- `stories`: Ephemeral content
- `questions`: Q&A questions
- `answers`: Answers to questions
- `developer_reels`: Short-form video content
- `job_posts`: Job listings
- `messages`: Chat messages

## 🚀 Deployment

The application can be deployed to any static hosting service:

1. Build the application:
   ```bash
   npm run build
   ```

2. Deploy the `dist` directory to your hosting service of choice (Netlify, Vercel, etc.)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Hekimcan Aktaş** - *Initial work*

## 🙏 Acknowledgments

- All the amazing open-source libraries that made this project possible
- The developer community for continuous inspiration and support