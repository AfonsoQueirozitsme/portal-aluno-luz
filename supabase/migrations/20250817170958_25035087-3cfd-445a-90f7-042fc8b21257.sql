-- First, set up the database schema for the authentication system

-- Create profiles table to store internal user profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 0,
  avatar_url TEXT,
  bio TEXT,
  institution TEXT,
  course TEXT,
  city TEXT,
  phone TEXT,
  date_of_birth DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Billing info (for EE - main account holders)
  address TEXT,
  postal_code TEXT,
  tax_number TEXT,
  
  -- Privacy settings
  privacy_statistics BOOLEAN NOT NULL DEFAULT true,
  privacy_newsletter BOOLEAN NOT NULL DEFAULT false,
  privacy_share_phone BOOLEAN NOT NULL DEFAULT false,
  privacy_share_email BOOLEAN NOT NULL DEFAULT false,
  
  -- Additional fields
  gender TEXT,
  marital_status TEXT,
  nationality TEXT,
  religion TEXT,
  allergies TEXT,
  special_needs TEXT,
  guardian_name TEXT,
  guardian_contact TEXT,
  notes TEXT,
  
  -- Credits and balance
  horas INTEGER NOT NULL DEFAULT 0,
  saldo NUMERIC NOT NULL DEFAULT 0,
  allow_pospago BOOLEAN NOT NULL DEFAULT false,
  wants_receipt BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own profiles" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can insert their own profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = auth_user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_profiles_auth_user_id ON public.profiles(auth_user_id);
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_level ON public.profiles(level);

-- Create table for profile invitations
CREATE TABLE IF NOT EXISTS public.profile_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for invitations
ALTER TABLE public.profile_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies for invitations
CREATE POLICY "Users can view their own invitations" 
ON public.profile_invitations 
FOR SELECT 
USING (auth.uid() = invited_by);

CREATE POLICY "Users can create invitations" 
ON public.profile_invitations 
FOR INSERT 
WITH CHECK (auth.uid() = invited_by);

-- Add index for invitations
CREATE INDEX idx_profile_invitations_token ON public.profile_invitations(token);
CREATE INDEX idx_profile_invitations_email ON public.profile_invitations(email);
CREATE INDEX idx_profile_invitations_expires_at ON public.profile_invitations(expires_at);