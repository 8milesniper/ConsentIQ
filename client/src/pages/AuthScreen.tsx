import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = loginSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginData = z.infer<typeof loginSchema>;
type SignupData = z.infer<typeof signupSchema>;

export const AuthScreen = (): JSX.Element => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const signupForm = useForm<SignupData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { username: "", password: "", confirmPassword: "" },
  });

  // Mock authentication for demo (replace with real API calls)
  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock success for demo
      localStorage.setItem("consentiq_user", JSON.stringify({ 
        username: data.username,
        id: "user-123" 
      }));
      return { success: true };
    },
    onSuccess: () => {
      toast({ title: "Welcome back!", description: "Successfully logged in." });
      setLocation("/dashboard");
    },
    onError: () => {
      toast({ 
        title: "Login failed", 
        description: "Invalid username or password.", 
        variant: "destructive" 
      });
    }
  });

  const signupMutation = useMutation({
    mutationFn: async (data: SignupData) => {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock success for demo
      localStorage.setItem("consentiq_user", JSON.stringify({ 
        username: data.username,
        id: "user-" + Date.now() 
      }));
      return { success: true };
    },
    onSuccess: () => {
      toast({ title: "Account created!", description: "Welcome to ConsentIQ." });
      setLocation("/dashboard");
    },
    onError: () => {
      toast({ 
        title: "Signup failed", 
        description: "Username might already be taken.", 
        variant: "destructive" 
      });
    }
  });

  const onLoginSubmit = (data: LoginData) => {
    loginMutation.mutate(data);
  };

  const onSignupSubmit = (data: SignupData) => {
    signupMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header with logo animation */}
      <div className="flex justify-center pt-20 pb-16">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 bg-[#4ade80] rounded-full flex items-center justify-center mb-6 animate-pulse">
            <svg viewBox="0 0 24 24" className="w-12 h-12 text-white">
              <path
                fill="currentColor"
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              />
            </svg>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#4ade80] rounded-full flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white">
                <path
                  fill="currentColor"
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                />
              </svg>
            </div>
            <span className="text-3xl font-bold text-black">ConsentIQ</span>
          </div>
        </div>
      </div>

      {/* Auth Form */}
      <div className="flex-1 px-6 max-w-md mx-auto w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-gray-600">
            {mode === "login" 
              ? "Sign in to your ConsentIQ account"
              : "Join ConsentIQ to ensure safe, consensual experiences"
            }
          </p>
        </div>

        {mode === "login" ? (
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
              <FormField
                control={loginForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your username" 
                        className="h-12 rounded-xl border-2 focus:border-[#4ade80]"
                        {...field}
                        data-testid="input-login-username"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password"
                        placeholder="Enter your password" 
                        className="h-12 rounded-xl border-2 focus:border-[#4ade80]"
                        {...field}
                        data-testid="input-login-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full bg-[#4ade80] hover:bg-[#22c55e] text-white py-3 rounded-xl text-lg font-semibold h-12"
                data-testid="button-login"
              >
                {loginMutation.isPending ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>
        ) : (
          <Form {...signupForm}>
            <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-6">
              <FormField
                control={signupForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Choose a username" 
                        className="h-12 rounded-xl border-2 focus:border-[#4ade80]"
                        {...field}
                        data-testid="input-signup-username"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={signupForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password"
                        placeholder="Create a password" 
                        className="h-12 rounded-xl border-2 focus:border-[#4ade80]"
                        {...field}
                        data-testid="input-signup-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={signupForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password"
                        placeholder="Confirm your password" 
                        className="h-12 rounded-xl border-2 focus:border-[#4ade80]"
                        {...field}
                        data-testid="input-signup-confirm-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit"
                disabled={signupMutation.isPending}
                className="w-full bg-[#4ade80] hover:bg-[#22c55e] text-white py-3 rounded-xl text-lg font-semibold h-12"
                data-testid="button-signup"
              >
                {signupMutation.isPending ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </Form>
        )}

        <div className="text-center mt-8 pb-8">
          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-[#4ade80] font-medium"
            data-testid="button-toggle-auth-mode"
          >
            {mode === "login" 
              ? "Don't have an account? Sign up" 
              : "Already have an account? Sign in"
            }
          </button>
        </div>
      </div>
    </div>
  );
};