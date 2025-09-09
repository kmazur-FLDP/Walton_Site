# Walton Global GIS Portal

A modern, responsive web application for Walton Global to view and manage GIS parcel data across multiple counties. Built with React, Tailwind CSS, and Supabase.

## Features

- 🔐 **Secure Authentication** - Supabase Auth with email/password
- 🗺️ **Interactive Maps** - Leaflet-powered mapping with parcel visualization  
- ⭐ **Favorites System** - Save and manage favorite parcels
- 📱 **Responsive Design** - Modern UI that works on all devices
- 🎨 **Professional Branding** - FLDP and Walton Global co-branded interface
- 🚀 **Fast Performance** - Built with Vite for optimal speed

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS
- **UI Components**: Headless UI, Heroicons, Framer Motion
- **Maps**: React Leaflet, OpenStreetMap
- **Backend**: Supabase (Auth, Database, RLS)
- **Deployment**: Netlify-ready

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
Copy the example environment file and add your Supabase credentials:
```bash
cp .env.example .env
```

Edit `.env` and add your Supabase project details:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Set Up Supabase Database
Run these SQL commands in your Supabase SQL editor:

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create favorite_parcels table
CREATE TABLE favorite_parcels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  parcel_id TEXT NOT NULL,
  county TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_parcels ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own favorites" ON favorite_parcels
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites" ON favorite_parcels
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites" ON favorite_parcels
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user profiles
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 4. Start Development Server
```bash
npm run dev
```

Visit `http://localhost:5173` to see your application.

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── LoadingSpinner.jsx
│   └── Navbar.jsx
├── pages/              # Main application pages
│   ├── LoginPage.jsx
│   ├── LandingPage.jsx
│   └── MapPage.jsx
├── context/            # React Context providers
│   └── AuthContext.jsx
├── lib/                # Utility libraries
│   └── supabase.js
├── hooks/              # Custom React hooks
├── assets/             # Static assets
│   └── logos/          # Logo files go here
└── main.jsx           # Application entry point
```

## Adding Logos

1. Place your company logo and client logo in `src/assets/logos/`
2. Update the logo references in:
   - `src/components/Navbar.jsx` (company logo)
   - `src/pages/LoginPage.jsx` (both logos)

## Customizing Brand Colors

Edit `tailwind.config.js` to match your brand colors:

```js
theme: {
  extend: {
    colors: {
      primary: {
        50: '#your-lightest-color',
        500: '#your-main-color', 
        600: '#your-hover-color',
        700: '#your-active-color',
        900: '#your-darkest-color',
      },
    },
  },
}
```

## Deployment

### Netlify Deployment
1. Build the project: `npm run build`
2. Deploy the `dist` folder to Netlify
3. Add environment variables in Netlify dashboard
4. Set up redirects for SPA routing

### Environment Variables for Production
Set these in your Netlify dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production  
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Next Steps

1. Add your actual GIS parcel data
2. Implement real county boundaries
3. Add more advanced map features (drawing tools, layer controls)
4. Set up proper user management in Supabase
5. Add data export functionality
6. Implement advanced search and filtering

## Support

For questions about this implementation, contact the FLDP development team.+ Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
