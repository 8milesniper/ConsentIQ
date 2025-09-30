import { Link } from "wouter";
import { Shield, Smartphone, Lock, Video, Zap, Heart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoPath from "@assets/ConsentIQ (2 x 4 in) (2 x 4 in) (Graph) (4)_1759218026571.png";
import { useEffect } from "react";

export default function LandingPage() {
  // Handle hash navigation on page load
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const element = document.querySelector(hash);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, []);

  const scrollToPricing = (e: React.MouseEvent) => {
    e.preventDefault();
    const pricingSection = document.querySelector('#pricing');
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-slate-900/95 backdrop-blur-sm z-50 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoPath} alt="ConsentIQ" className="w-10 h-10" />
            <span className="text-xl font-bold">ConsentIQ</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-300 hover:text-white transition">Features</a>
            <a href="#how-it-works" className="text-gray-300 hover:text-white transition">How It Works</a>
            <a href="#pricing" className="text-gray-300 hover:text-white transition">Pricing</a>
            <Link href="/login">
              <Button variant="ghost" className="text-white hover:bg-slate-800" data-testid="button-login">Login</Button>
            </Link>
            <Button onClick={scrollToPricing} className="bg-[#4ade80] hover:bg-[#22c55e] text-white" data-testid="button-get-started-nav">Get Started</Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#4ade80]/20 text-[#4ade80] px-4 py-2 rounded-full mb-6">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">The Future of Consent is Here</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            Never Wonder <span className="text-[#4ade80]">Again</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-300 mb-4 max-w-3xl mx-auto">
            The smart way to secure clear consent before intimate moments.
          </p>
          <p className="text-lg md:text-xl text-[#4ade80] font-semibold mb-8">
            Protect yourself, respect your partner, and build trust.
          </p>

          <div className="flex justify-center items-center mb-12">
            <Button onClick={scrollToPricing} size="lg" className="bg-[#4ade80] hover:bg-[#22c55e] text-white text-lg px-8 py-6" data-testid="button-get-started-hero">
              📱 Get Started Now
            </Button>
          </div>

          <div className="flex flex-wrap justify-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-[#4ade80]" fill="#4ade80" />
              <span>4.9/5 Rating</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#4ade80]" />
              <span>10k+ Users</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#4ade80]" />
              <span>100% Private</span>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 px-6 bg-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">The Problem Every Guy Faces</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-red-900/30 to-slate-900 p-8 rounded-2xl border border-red-800/30">
              <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center mb-4">
                <span className="text-3xl">💬</span>
              </div>
              <h3 className="text-2xl font-bold mb-3">Miscommunication</h3>
              <p className="text-gray-300">
                Mixed signals and unclear consent can lead to serious misunderstandings
              </p>
            </div>

            <div className="bg-gradient-to-br from-yellow-900/30 to-slate-900 p-8 rounded-2xl border border-yellow-800/30">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <h3 className="text-2xl font-bold mb-3">False Accusations</h3>
              <p className="text-gray-300">
                Protect yourself from potential legal issues with clear documentation
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-900/30 to-slate-900 p-8 rounded-2xl border border-blue-800/30">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                <span className="text-3xl">💙</span>
              </div>
              <h3 className="text-2xl font-bold mb-3">Trust Issues</h3>
              <p className="text-gray-300">
                Build stronger relationships with transparent communication
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4">The Smart Solution</h2>
          <p className="text-xl text-center text-[#4ade80] mb-16">
            ConsentIQ makes consent clear, documented, and respectful. It's not awkward - it's smart.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700 hover:border-[#4ade80] transition">
              <div className="w-14 h-14 bg-[#4ade80]/20 rounded-xl flex items-center justify-center mb-4">
                <Zap className="w-7 h-7 text-[#4ade80]" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Instant QR Code</h3>
              <p className="text-gray-300">
                Generate a QR code in seconds. Your partner scans it on their phone - simple and discreet.
              </p>
            </div>

            <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700 hover:border-[#4ade80] transition">
              <div className="w-14 h-14 bg-[#4ade80]/20 rounded-xl flex items-center justify-center mb-4">
                <Video className="w-7 h-7 text-[#4ade80]" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Video Consent</h3>
              <p className="text-gray-300">
                They record a quick video saying "Yes, I consent" - clear, undeniable, and legally sound.
              </p>
            </div>

            <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700 hover:border-[#4ade80] transition">
              <div className="w-14 h-14 bg-[#4ade80]/20 rounded-xl flex items-center justify-center mb-4">
                <Lock className="w-7 h-7 text-[#4ade80]" />
              </div>
              <h3 className="text-2xl font-bold mb-3">100% Private</h3>
              <p className="text-gray-300">
                Videos are encrypted and stored securely. Only text confirmation is provided - complete privacy.
              </p>
            </div>

            <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700 hover:border-[#4ade80] transition">
              <div className="w-14 h-14 bg-[#4ade80]/20 rounded-xl flex items-center justify-center mb-4">
                <Smartphone className="w-7 h-7 text-[#4ade80]" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Mobile First</h3>
              <p className="text-gray-300">
                Works perfectly on any smartphone. No app download required for your partner.
              </p>
            </div>

            <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700 hover:border-[#4ade80] transition">
              <div className="w-14 h-14 bg-[#4ade80]/20 rounded-xl flex items-center justify-center mb-4">
                <Shield className="w-7 h-7 text-[#4ade80]" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Legally Sound</h3>
              <p className="text-gray-300">
                Designed with legal experts to ensure your protection is rock solid.
              </p>
            </div>

            <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700 hover:border-[#4ade80] transition">
              <div className="w-14 h-14 bg-[#4ade80]/20 rounded-xl flex items-center justify-center mb-4">
                <Heart className="w-7 h-7 text-[#4ade80]" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Build Trust</h3>
              <p className="text-gray-300">
                Show you care about consent and respect. It's actually attractive to partners.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6 bg-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4">How It Works</h2>
          <p className="text-xl text-center text-gray-300 mb-16">Three simple steps to clear consent</p>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-20 h-20 bg-[#4ade80] rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl font-bold">1</span>
              </div>
              <h3 className="text-2xl font-bold mb-4">Generate QR Code</h3>
              <p className="text-gray-300">
                Open ConsentIQ and tap "Start New". A QR code appears instantly on your phone.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-[#4ade80] rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl font-bold">2</span>
              </div>
              <h3 className="text-2xl font-bold mb-4">Partner Scans</h3>
              <p className="text-gray-300">
                Your partner scans the QR code with their phone camera. No app download needed.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-[#4ade80] rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl font-bold">3</span>
              </div>
              <h3 className="text-2xl font-bold mb-4">Record Consent</h3>
              <p className="text-gray-300">
                They record a quick video saying "Yes, I consent". You get instant confirmation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">What Users Say</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-[#4ade80]" fill="#4ade80" />
                ))}
              </div>
              <p className="text-gray-300 mb-4">
                "Game changer. My girlfriend actually appreciated that I cared about clear consent. Made everything better."
              </p>
              <p className="text-sm text-gray-400">- Jake, 22, College Student</p>
            </div>

            <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-[#4ade80]" fill="#4ade80" />
                ))}
              </div>
              <p className="text-gray-300 mb-4">
                "Saved me from a potential nightmare. Worth every penny for the peace of mind."
              </p>
              <p className="text-sm text-gray-400">- Marcus, 24, Graduate Student</p>
            </div>

            <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-[#4ade80]" fill="#4ade80" />
                ))}
              </div>
              <p className="text-gray-300 mb-4">
                "Not awkward at all. Shows you're mature and responsible. Girls respect that."
              </p>
              <p className="text-sm text-gray-400">- Alex, 21, University</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 bg-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4">Simple Pricing</h2>
          <p className="text-xl text-center text-gray-300 mb-16">Choose the plan that works for you</p>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 hover:border-[#4ade80] transition">
              <h3 className="text-2xl font-bold mb-2">Monthly</h3>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-5xl font-bold">$40</span>
                <span className="text-gray-400">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-[#4ade80] rounded-full flex items-center justify-center">
                    <span className="text-xs">✓</span>
                  </div>
                  <span>Unlimited consent sessions</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-[#4ade80] rounded-full flex items-center justify-center">
                    <span className="text-xs">✓</span>
                  </div>
                  <span>AI speech verification</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-[#4ade80] rounded-full flex items-center justify-center">
                    <span className="text-xs">✓</span>
                  </div>
                  <span>Secure encrypted storage</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-[#4ade80] rounded-full flex items-center justify-center">
                    <span className="text-xs">✓</span>
                  </div>
                  <span>Cancel anytime</span>
                </li>
              </ul>
              <Link href="/register?plan=monthly">
                <Button className="w-full bg-[#4ade80] hover:bg-[#22c55e] text-white py-6 text-lg" data-testid="button-subscribe-monthly">
                  Get Started
                </Button>
              </Link>
            </div>

            <div className="bg-gradient-to-br from-[#4ade80]/20 to-slate-800 p-8 rounded-2xl border-2 border-[#4ade80] relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#4ade80] text-white px-4 py-1 rounded-full text-sm font-semibold">
                Save $80/year
              </div>
              <h3 className="text-2xl font-bold mb-2">Annual</h3>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-5xl font-bold">$400</span>
                <span className="text-gray-400">/year</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-[#4ade80] rounded-full flex items-center justify-center">
                    <span className="text-xs">✓</span>
                  </div>
                  <span>Everything in Monthly</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-[#4ade80] rounded-full flex items-center justify-center">
                    <span className="text-xs">✓</span>
                  </div>
                  <span>2 months free ($80 savings)</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-[#4ade80] rounded-full flex items-center justify-center">
                    <span className="text-xs">✓</span>
                  </div>
                  <span>Priority support</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-[#4ade80] rounded-full flex items-center justify-center">
                    <span className="text-xs">✓</span>
                  </div>
                  <span>Best value</span>
                </li>
              </ul>
              <Link href="/register?plan=annual">
                <Button className="w-full bg-[#4ade80] hover:bg-[#22c55e] text-white py-6 text-lg" data-testid="button-subscribe-annual">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-gradient-to-r from-[#4ade80] to-[#22c55e]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Protect Yourself?</h2>
          <p className="text-xl mb-8 text-white/90">
            Join thousands of smart guys who are taking control of their safety and building better relationships.
          </p>
          <Button onClick={scrollToPricing} size="lg" className="bg-white text-slate-900 hover:bg-slate-100 text-lg px-12 py-6 font-bold" data-testid="button-get-started-cta">
            🔒 Get Started Now
          </Button>
          <p className="text-sm mt-4 text-white/80">No credit card required • 100% private and secure</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-12 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <img src={logoPath} alt="ConsentIQ" className="w-10 h-10" />
              <span className="text-xl font-bold">ConsentIQ</span>
            </div>
            <div className="flex gap-8 text-sm text-gray-400">
              <a href="#" className="hover:text-white transition">Privacy</a>
              <a href="#" className="hover:text-white transition">Terms</a>
              <a href="mailto:support@consentiq.tech" className="hover:text-white transition">support@consentiq.tech</a>
            </div>
          </div>
          <p className="text-center text-gray-400 text-sm mt-8">
            © 2024 ConsentIQ. All rights reserved. Protecting relationships, one consent at a time.
          </p>
        </div>
      </footer>
    </div>
  );
}
