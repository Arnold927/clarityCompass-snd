'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Users, Shield, Eye, EyeOff, AlertCircle, Globe } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { sharedPortalAPI } from '@/lib/shared-portal';

export default function SharedPortalLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await sharedPortalAPI.login(username, password);
      const { access, refresh } = response.data;

      localStorage.setItem('access', access);
      localStorage.setItem('refresh', refresh);
      localStorage.setItem('shared_portal_token', access);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      window.location.href = '/shared-portal';
      
    } catch (err: any) {
      console.error(' Login error:', err);
      let errorMessage = 'Login failed. Please check your credentials.';
      if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.response?.data?.non_field_errors) {
        errorMessage = err.response.data.non_field_errors[0];
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E8C97A]/10 via-white to-[#D4845A]/10 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex flex-col items-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-[#C8793A]/10">
              <Globe className="h-10 w-10 text-[#C8793A]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#5A3010]">Shared Portal</h1>
            </div>
          </div>
        </div>

        <Card className="border-[#E8C97A]/30 shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl text-[#5A3010]">Login</CardTitle>
            <CardDescription className="text-[#5A3010]/60">
              Use your NGO platform credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4 bg-red-50 border-red-200 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-[#5A3010]">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter username or email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11 border-[#E8C97A]/50 focus:border-[#C8793A] focus:ring-[#C8793A]/10"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[#5A3010]">Password</Label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-[#C8793A] hover:text-[#E8631A]"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-11 pr-10 border-[#E8C97A]/50 focus:border-[#C8793A] focus:ring-[#C8793A]/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#5A3010]/40 hover:text-[#5A3010]/60"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="remember"
                    className="rounded border-[#E8C97A] text-[#C8793A] focus:ring-[#C8793A]"
                    disabled={isLoading}
                  />
                  <Label htmlFor="remember" className="text-sm text-[#5A3010]/70">
                    Remember me
                  </Label>
                </div>
                <Link 
                  href="/shared-portal/forgot-password" 
                  className="text-sm text-[#C8793A] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-11 bg-[#C8793A] hover:bg-[#E8631A] text-white" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    <span className="ml-2">Authenticating...</span>
                  </>
                ) : (
                  <>
                    Login <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-[#E8C97A]/20">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-[#5A3010]/40">
                  <Shield className="h-4 w-4" />
                  <span>JWT-secured authentication</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link 
            href="/" 
            className="inline-flex items-center text-sm text-[#5A3010]/60 hover:text-[#C8793A] transition-colors"
          >
            <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
            Return to home page
          </Link>
        </div>
      </div>
    </div>
  );
}
