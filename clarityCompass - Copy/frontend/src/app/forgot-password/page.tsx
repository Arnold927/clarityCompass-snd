"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, Mail, Building2 } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/forgot-password/", { email });
      toast.success(res.data.detail || "If an account exists, you’ll receive a reset link.");
    } catch {
      toast.error("An error occurred. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E8C97A]/10 via-white to-[#D4845A]/10 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#C8793A]/10 mb-6">
            <Building2 className="h-8 w-8 text-[#C8793A]" />
          </div>
          <h1 className="text-2xl font-bold text-[#5A3010]">Forgot Password?</h1>
          <p className="text-[#5A3010]/70 mt-2">
            Enter your email to receive a password reset link
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-[#E8C97A]/30 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#5A3010]">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-[#5A3010]/40" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@organization.org"
                  className="pl-10 border-[#E8C97A]/50 focus:border-[#C8793A] focus:ring-[#C8793A]/10 h-11"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 bg-[#C8793A] hover:bg-[#E8631A] text-white font-medium" 
              disabled={loading || !email}
            >
              {loading ? "Sending..." : "Request Reset Link"}
            </Button>

            <div className="text-center pt-2">
              <Link 
                href="/login" 
                className="inline-flex items-center text-sm text-[#C8793A] hover:text-[#E8631A] transition-colors font-medium"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
