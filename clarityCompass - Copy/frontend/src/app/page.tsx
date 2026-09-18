import React from "react";
import { ArrowRight, Users, Building } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-[#FFFFFF] p-6 overflow-hidden">
      {/* Savanna themed background elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#E8C97A] blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#D4845A] blur-[120px]" />
      </div>

      <div className="relative z-20 flex flex-col items-center justify-center w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex flex-col items-center justify-center gap-4 mb-4">
            {/* SND Logo */}
            <img 
              src="/logo.png" 
              alt="Strategies for Northern Development" 
              className="h-24 md:h-28 w-auto object-contain drop-shadow-sm"
            />
            <h1 className="text-3xl md:text-4xl font-bold text-[#5A3010] tracking-tight">
              SND Portal
            </h1>
          </div>
          <p className="text-base text-[#5A3010]/70 max-w-xl mx-auto leading-relaxed">
            Empowering pastoralist communities through strategic development and resilience building.
          </p>
        </div>
        
        <div className="grid w-full grid-cols-1 md:grid-cols-2 gap-6">
          {/* NGO Platform Card */}
          <Card className="flex flex-col bg-white/80 backdrop-blur-md border-[#E8C97A]/30 shadow-lg hover:shadow-xl transition-all duration-300 group">
            <CardHeader className="pb-2 pt-5 px-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#C8793A]/10 text-[#C8793A] group-hover:bg-[#C8793A] group-hover:text-white transition-colors duration-300">
                  <Building className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-[#5A3010] text-lg">NGO Platform</CardTitle>
                  <CardDescription className="text-[#5A3010]/60 text-xs mt-0.5">
                    Manage internal operations, projects, and reporting.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-grow px-5 py-3">
              <ul className="space-y-2">
                {[
                  "Strategic Planning & Projects",
                  "M&E Indicator Tracking",
                  "Automated Reporting",
                  "Data Collection & AI Analysis"
                ].map((item) => (
                  <li key={item} className="flex items-center text-sm text-[#5A3010]/70">
                    <div className="h-1 w-1 rounded-full bg-[#4A6830] mr-2" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
            <div className="p-5 pt-0">
              <Link href="/login" className="block">
                <Button className="w-full bg-[#C8793A] hover:bg-[#E8631A] text-white h-10 text-sm font-medium transition-colors shadow-md">
                  Go to NGO Dashboard <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </Card>

          {/* Shared Portal Card */}
          <Card className="flex flex-col bg-white/80 backdrop-blur-md border-[#E8C97A]/30 shadow-lg hover:shadow-xl transition-all duration-300 group">
            <CardHeader className="pb-2 pt-5 px-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#4A6830]/10 text-[#4A6830] group-hover:bg-[#4A6830] group-hover:text-white transition-colors duration-300">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-[#5A3010] text-lg">Shared Portal</CardTitle>
                  <CardDescription className="text-[#5A3010]/60 text-xs mt-0.5">
                    Collaborate with donors and external partners.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-grow px-5 py-3">
              <ul className="space-y-2">
                {[
                  "Proposal Collaboration",
                  "External Report Sharing",
                  "Partner Communication",
                  "Document Exchange"
                ].map((item) => (
                  <li key={item} className="flex items-center text-sm text-[#5A3010]/70">
                    <div className="h-1 w-1 rounded-full bg-[#C8793A] mr-2" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
            <div className="p-5 pt-0">
              <Link href="/shared-portal/login" className="block">
                <Button variant="outline" className="w-full border-[#C8793A] text-[#C8793A] hover:bg-[#C8793A]/5 h-10 text-sm font-medium transition-colors">
                  Access Shared Portal <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>
        
        <div className="mt-10 text-center">
          <p className="text-xs text-[#5A3010]/40 font-medium tracking-wider uppercase">
            © {new Date().getFullYear()} Strategies for Northern Development
          </p>
        </div>
      </div>
    </main>
  );
}