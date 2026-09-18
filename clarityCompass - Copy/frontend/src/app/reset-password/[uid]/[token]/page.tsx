"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import api from "@/lib/api";
import { Lock, Building2, ShieldCheck } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      // Note: Backend might use uidb64 or uid, using params.uid as fallback if uidb64 isn't present
      const uid = params.uidb64 || params.uid;
      const res = await api.post(`/reset-password/${uid}/${params.token}/`, { password });
      toast.success(res.data.detail || "Password reset successfully.");
      router.push("/login");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Invalid or expired link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E8C97A]/10 via-white to-[#D4845A]/10 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#C8793A]/10 mb-6">
            <ShieldCheck className="h-8 w-8 text-[#C8793A]" />
          </div>
          <h1 className="text-2xl font-bold text-[#5A3010]">Set New Password</h1>
          <p className="text-[#5A3010]/70 mt-2">
            Please enter your new secure password below
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-[#E8C97A]/30 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password" title="New Password" />
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-[#5A3010]/40" />
                <Input
                  id="password"
                  type="password"
                  placeholder="New password"
                  className="pl-10 border-[#E8C97A]/50 focus:border-[#C8793A] focus:ring-[#C8793A]/10 h-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm" title="Confirm Password" />
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-[#5A3010]/40" />
                <Input
                  id="confirm"
                  type="password"
                  placeholder="Confirm new password"
                  className="pl-10 border-[#E8C97A]/50 focus:border-[#C8793A] focus:ring-[#C8793A]/10 h-11"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 bg-[#C8793A] hover:bg-[#E8631A] text-white font-medium" 
              disabled={loading || !password || !confirm}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
