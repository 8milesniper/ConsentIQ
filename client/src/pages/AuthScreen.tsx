import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const createAccountSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  phoneNumber: z.string().min(10, "Valid phone number required"),
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signInSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type CreateAccountData = z.infer<typeof createAccountSchema>;
type SignInData = z.infer<typeof signInSchema>;

export const AuthScreen = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { setAuthData } = useAuth();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isSignIn, setIsSignIn] = useState(false);

  const form = useForm<CreateAccountData | SignInData>({
    resolver: zodResolver(isSignIn ? signInSchema : createAccountSchema),
    defaultValues: {
      fullName: "",
      phoneNumber: "",
      email: "",
      password: "",
    },
  });  
  
  // Reset form when switching between sign-in and create account
  useEffect(() => {
    form.reset();
  }, [isSignIn]);

  const authMutation = useMutation({
    mutationFn: async (data: CreateAccountData | SignInData) => {
      const endpoint = isSignIn ? "/api/auth/login" : "/api/auth/register";
      const payload = isSignIn 
        ? {
            username: data.email,
            password: data.password,
          }
        : {
            username: data.email,
            password: data.password,
            fullName: (data as CreateAccountData).fullName,
            phoneNumber: (data as CreateAccountData).phoneNumber,
            profilePicture: profileImage, // Include the profile picture
          };
          
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `${isSignIn ? 'Sign in' : 'Account creation'} failed`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      console.log("Registration/login successful", data);
      setAuthData(data.user);
      
      // Show success message
      toast({ 
        title: `${isSignIn ? 'Welcome back!' : 'Account created successfully!'}`, 
        description: `${isSignIn ? 'You have been signed in.' : 'Redirecting to your dashboard...'}`,
      });
      
      // Immediate redirect - don't wait for timeout
      console.log("Redirecting to dashboard immediately");
      setLocation("/dashboard");
    },
    onError: (error: Error) => {
      toast({ 
        title: `${isSignIn ? 'Sign in' : 'Account creation'} failed`, 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  const onSubmit = (data: CreateAccountData | SignInData) => {
    authMutation.mutate(data);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* ConsentIQ Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-8 h-8 bg-[#4ade80] rounded-full flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white">
                <path
                  fill="currentColor"
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                />
                <path
                  fill="currentColor"
                  d="M9.5 14.5L7 12l-1 1L9.5 16.5L18 8l-1-1L9.5 14.5z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">ConsentIQ</h1>
          </div>
          
          <h2 className="text-xl font-semibold text-white mb-2">{isSignIn ? 'Sign In' : 'Create Account'}</h2>
          <p className="text-gray-400 text-sm">{isSignIn ? 'Welcome back to ConsentIQ' : 'Set up your consent verification profile'}</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Profile Picture - Only show for account creation */}
            {!isSignIn && (
              <div className="text-center">
                <p className="text-white font-medium mb-4">Profile Picture</p>
                <div className="relative mx-auto w-24 h-24 mb-4">
                  <div className="w-full h-full rounded-full bg-gray-700 border-2 border-gray-600 flex items-center justify-center overflow-hidden">
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-500 text-sm">Photo</span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    data-testid="input-profile-image"
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => document.querySelector<HTMLInputElement>('[data-testid="input-profile-image"]')?.click()}
                  className="bg-[#4ade80] hover:bg-[#22c55e] text-white text-sm px-6 py-2 rounded-md"
                  data-testid="button-upload"
                >
                  Upload
                </Button>
                <p className="text-gray-500 text-xs mt-2">Required for verification</p>
              </div>
            )}

            {/* Full Name - Only for account creation */}
            {!isSignIn && (
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white font-medium">Full Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Your full name"
                        className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-[#4ade80] focus:ring-[#4ade80]"
                        {...field}
                        data-testid="input-full-name"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
            )}

            {/* Phone Number - Only for account creation */}
            {!isSignIn && (
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white font-medium">Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Your phone number"
                        className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-[#4ade80] focus:ring-[#4ade80]"
                        {...field}
                        data-testid="input-phone-number"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
            )}

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white font-medium">Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-[#4ade80] focus:ring-[#4ade80]"
                      {...field}
                      data-testid="input-email"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            {/* Password */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white font-medium">Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-[#4ade80] focus:ring-[#4ade80]"
                      {...field}
                      data-testid="input-password"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={authMutation.isPending}
              className="w-full bg-[#4ade80] hover:bg-[#22c55e] text-white font-semibold py-3 rounded-md transition-colors"
              data-testid={isSignIn ? "button-sign-in" : "button-create-account"}
            >
              {authMutation.isPending ? (isSignIn ? "Signing In..." : "Creating Account...") : (isSignIn ? "Sign In" : "Create Account")}
            </Button>
          </form>
        </Form>

        {/* Toggle Sign In / Create Account */}
        <div className="text-center mt-6">
          <p className="text-gray-400 text-sm">
            {isSignIn ? "New to ConsentIQ? " : "Already have an account? "}
            <button 
              onClick={() => setIsSignIn(!isSignIn)} 
              className="text-[#4ade80] hover:text-[#22c55e] font-medium"
              data-testid={isSignIn ? "link-create-account" : "link-sign-in"}
            >
              {isSignIn ? "Create Account" : "Sign In"}
            </button>
          </p>
        </div>

        {/* Add to Home Screen suggestion for mobile */}
        <div className="text-center mt-4 md:hidden">
          <div className="bg-gray-800 rounded-lg p-3 mx-4">
            <p className="text-gray-300 text-xs mb-2">💡 Save ConsentIQ to your home screen for quick access</p>
            <p className="text-gray-400 text-xs">Tap Share → Add to Home Screen in your browser</p>
          </div>
        </div>
      </div>
    </div>
  );
};