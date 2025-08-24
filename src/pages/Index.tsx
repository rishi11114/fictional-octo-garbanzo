import heroImage from "@/assets/health-hero.jpg";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Link } from "react-router-dom";
import HealthAssistant from "../components/HealthAssistant";
import { Moon, Sun } from "lucide-react"; // icons

const features = [
  { title: "Collaborative Hub", desc: "Connect providers, NGOs, and volunteers to share services & infrastructure." },
  { title: "Report", desc: "Report illnesses and crises in real-time with geo context." },
  { title: "Telemedicine", desc: "Virtual consults with verified professionals and support lines." },
  { title: "Wellness Education", desc: "Interactive, multilingual preventive care modules." },
  { title: "Campaign Tracker", desc: "Dashboards for drives, camps, and programs." },
  { title: "Feedback & Referral", desc: "Rate services, refer cases, and escalate emergencies." },
];

type IndexProps = {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
};

const Index = ({ darkMode, setDarkMode }: IndexProps) => {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[hsl(var(--background))] to-[hsl(var(--background))/90%] transition-colors duration-500 dark:from-gray-900 dark:to-gray-950">
      <SEO
        title="Health Hub – Collaborative Care Platform"
        description="Report health issues, access telemedicine, learn wellness, and track community programs in one place."
      />

      {/* Dark/Light Mode Toggle */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        className="fixed top-20 right-5 z-50 p-2 md:p-3 rounded-full shadow-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:scale-110 transition-transform duration-300 sm:top-10 md:top-16 lg:top-20"
        aria-label="Toggle Dark Mode"
      >
        {darkMode ? (
          <Sun className="text-yellow-400 w-5 h-5 md:w-6 md:h-6" />
        ) : (
          <Moon className="text-gray-200 w-5 h-5 md:w-6 md:h-6" />
        )}
      </button>

      {/* HERO SECTION */}
      <section
        className="container pt-4 md:pt-16 pb-8 md:pb-16 relative overflow-visible"
        role="banner"
      >
        <div className="flex flex-col md:grid md:grid-cols-2 gap-6 md:gap-8 items-center">
          {/* LEFT TEXT */}
          <div className="animate-fadeInUp text-center md:text-left">
            <h1
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 md:mb-6 leading-tight 
              text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--brand))] to-[hsl(var(--brand-2))] drop-shadow-lg"
            >
              Health Hub: Care that connects
            </h1>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground mb-4 md:mb-8 max-w-prose mx-auto md:mx-0 dark:text-gray-300">
              A centralized platform delivering seamless health services—report,
              consult, learn, and mobilize with cutting-edge technology.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center md:justify-start">
              <Button
                variant="hero"
                size="lg"
                className="w-full sm:w-auto hover:shadow-xl hover:scale-105 transition-all duration-300"
                asChild
              >
                <Link to="/consult" aria-label="Start a virtual consultation">
                  Start Consult
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto hover:shadow-lg hover:scale-105 transition-all duration-300"
                asChild
              >
                <Link to="/dashboard" aria-label="Report a health case">
                  Report Case
                </Link>
              </Button>
            </div>
          </div>

          {/* RIGHT IMAGE */}
          <div className="relative flex justify-center items-center">
            <div
              className="absolute -inset-4 md:-inset-10 lg:-inset-16 rounded-xl blur-2xl md:blur-3xl opacity-30 bg-gradient-to-br from-[hsl(var(--brand))] to-[hsl(var(--brand-2))] animate-pulse-slow"
              aria-hidden="true"
            />
            <img
              src={heroImage}
              alt="Illustration of telemedicine and community health collaboration"
              className="relative max-w-[200px] sm:max-w-[300px] md:max-w-[360px] lg:max-w-[500px] h-auto object-contain rounded-xl border border-[hsl(var(--border))] shadow-[var(--shadow-glow)] hover:scale-105 transition-transform duration-500"
              loading="eager"
            />
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section
        className="container py-10 md:py-20"
        role="region"
        aria-label="Key features"
      >
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6 md:mb-12 text-center text-[hsl(var(--brand))] dark:text-blue-400">
          All-in-One Health Solutions
        </h2>
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <article
              key={f.title}
              className="rounded-xl border bg-card p-4 sm:p-6 hover:bg-[hsl(var(--brand))/10] hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 dark:bg-gray-800 dark:border-gray-700"
              role="article"
            >
              <h3 className="font-semibold mb-2 sm:mb-3 text-lg sm:text-xl text-[hsl(var(--foreground))] dark:text-gray-100">
                <Link
                  className="hover:text-[hsl(var(--brand))] transition-colors duration-200"
                  to={
                    f.title === "Collaborative Hub"
                      ? "/dashboard"
                      : f.title === "Report"
                      ? "/dashboard"
                      : f.title === "Telemedicine"
                      ? "/consult"
                      : f.title === "Wellness Education"
                      ? "/education"
                      : f.title === "Campaign Tracker"
                      ? "/campaigns"
                      : "/feedback"
                  }
                  aria-label={`Learn more about ${f.title.toLowerCase()}`}
                >
                  {f.title}
                </Link>
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground dark:text-gray-400">
                {f.desc}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* CAMPAIGN SECTION */}
      <section
        className="container pb-12 md:pb-24"
        role="region"
        aria-label="Campaign tracking"
      >
        <div className="rounded-xl border p-4 md:p-8 flex flex-col items-center gap-4 md:gap-6 bg-gradient-to-br from-[hsl(var(--brand))/10] to-[hsl(var(--background))] animate-gradient-shift dark:from-blue-900/30 dark:to-gray-900 dark:border-gray-700">
          <div className="text-center">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold mb-2 text-[hsl(var(--brand))] dark:text-blue-400">
              Track Campaigns & Outcomes
            </h2>
            <p className="text-sm md:text-muted-foreground dark:text-gray-300">
              Monitor immunizations, health camps, blood drives, and more with
              real-time insights.
            </p>
          </div>
          <Button
            variant="hero"
            className="w-full md:w-auto hover:shadow-xl hover:scale-105 transition-all duration-300"
            asChild
          >
            <Link to="/campaigns" aria-label="Open campaign dashboards">
              View Dashboards
            </Link>
          </Button>
        </div>
      </section>

      {/* CHATBOT SECTION */}
      <section
        className="container pb-12 md:pb-24"
        role="region"
        aria-label="Health assistant chatbot"
      >
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-5 md:mb-10 text-center text-[hsl(var(--brand))] dark:text-blue-400">
          AI Health Assistant
        </h2>
        <div className="animate-fadeInUp">
          <HealthAssistant />
        </div>
      </section>
    </main>
  );
};

export default Index;