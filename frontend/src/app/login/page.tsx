"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import api from "@/lib/api";
import Link from "next/link";
import { Eye, EyeOff, Lock, User, ArrowRight, ArrowLeft, Shield } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.post("/token/", { username, password });

      localStorage.setItem("ngo_access_token", res.data.access);
      localStorage.setItem("ngo_refresh_token", res.data.refresh);

      toast.success("Welcome back!");
      router.push("/dashboard");
      
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError("Invalid credentials. Please try again.");
        toast.error("Invalid credentials");
      } else {
        setError("Connection issue. Please check your network.");
        toast.error("Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-[#E8C97A]/15 via-[#FBF7F2] to-[#D4845A]/10 p-4 md:p-8">
      <div className="w-full max-w-md">
        {/* Back to Home */}
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[#5A3010]/60 hover:text-[#C8793A] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
          </Link>
        </div>

        {/* Header with SND Logo */}
        <div className="text-center mb-10 md:mb-12">
          <div className="inline-flex items-center justify-center mb-6">
            <img 
              src="/logo.png" 
              alt="Strategies for Northern Development" 
              className="h-24 w-auto object-contain"
            />
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold text-[#5A3010] mb-3 tracking-tight">
            SND Portal
          </h1>
          <p className="text-[#5A3010]/70 text-sm md:text-base max-w-xs mx-auto leading-relaxed">
            Secure access to manage organization programs and projects
          </p>
          <p className="text-xs mt-3 italic" style={{color:"#A08060"}}>
            Confronting crisis&nbsp;·&nbsp;Building Resilience&nbsp;·&nbsp;Transforming lives
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-[#E8C97A]/30 p-6 md:p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Username Field */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-[#5A3010] text-sm font-medium">
                Username
              </Label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-[#5A3010]/40">
                  <User className="h-4 w-4" />
                </div>
                <Input
                  id="username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="pl-10 h-11 text-sm border-[#E8C97A]/50 focus:border-[#C8793A] focus:ring-[#C8793A]/10 transition-all"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[#5A3010] text-sm font-medium">
                  Password
                </Label>
                <button
                  type="button"
                  className="text-xs text-[#C8793A] hover:text-[#E8631A] transition-colors"
                  onClick={() => toast.info("Contact support for password reset")}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-[#5A3010]/40">
                  <Lock className="h-4 w-4" />
                </div>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10 pr-10 h-11 text-sm border-[#E8C97A]/50 focus:border-[#C8793A] focus:ring-[#C8793A]/10 transition-all"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-[#5A3010]/40 hover:text-[#5A3010]/60 transition-colors p-1"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg border" style={{backgroundColor:"#FEF0E7",borderColor:"#F4A87C"}}>
                <p className="text-xs text-center font-medium" style={{color:"#9B3B0A"}}>{error}</p>
              </div>
            )}

            {/* Remember Me */}
            <div className="flex items-center">
              <Checkbox 
                id="remember" 
                className="h-4 w-4 border-[#E8C97A] data-[state=checked]:bg-[#C8793A] data-[state=checked]:border-[#C8793A]"
              />
              <Label 
                htmlFor="remember" 
                className="ml-2 text-sm text-[#5A3010]/70 cursor-pointer select-none"
              >
                Keep me signed in
              </Label>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full h-11 font-medium bg-[#C8793A] hover:bg-[#E8631A] text-white transition-colors shadow-sm hover:shadow"
              disabled={loading || !username || !password}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2"></div>
                  <span className="opacity-90">Signing in...</span>
                </div>
              ) : (
                <span className="flex items-center justify-center">
                  Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </span>
              )}
            </Button>

            {/* Divider — commented out along with the Shared Portal button below;
                restore both together if the Shared Portal is re-enabled. */}
            {/*
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E8C97A]/30"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-white text-xs text-[#5A3010]/40 font-medium">OR</span>
              </div>
            </div>
            */}

            {/* Shared Portal Button — commented out, not currently offered.
                To restore: uncomment this block. */}
            {/*
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 border-[#E8C97A]/50 hover:border-[#C8793A] hover:bg-[#E8C97A]/10 transition-colors text-[#5A3010]"
              onClick={() => router.push('/shared-portal/login')}
            >
              <Globe className="mr-2 h-4 w-4" />
              Access Shared Portal
            </Button>
            */}

            {/* Security Note */}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-center text-[#5A3010]/40 mb-2">
                <Shield className="h-3 w-3 mr-1" />
                <span className="text-xs">Secure connection</span>
              </div>
              <p className="text-xs text-[#5A3010]/40 text-center">
                By signing in, you agree to our{" "}
                <button 
                  type="button" 
                  className="text-[#C8793A] hover:text-[#E8631A] font-medium underline underline-offset-2"
                  onClick={() => toast.info("Terms of Service")}
                >
                  Terms
                </button>{" "}
                and{" "}
                <button 
                  type="button" 
                  className="text-[#C8793A] hover:text-[#E8631A] font-medium underline underline-offset-2"
                  onClick={() => toast.info("Privacy Policy")}
                >
                  Privacy
                </button>
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-[#5A3010]/40">
            Need help?{" "}
            <button 
              type="button" 
              className="text-[#C8793A] hover:text-[#E8631A] font-medium"
              onClick={() => toast.info("Email: support@snd-ngo.org")}
            >
              Contact Support
            </button>
          </p>
          <p className="text-xs text-[#5A3010]/30 mt-2">
            © {new Date().getFullYear()} Strategies for Northern Development
          </p>
        </div>
      </div>
    </main>
  );
}
