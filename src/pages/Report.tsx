import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";

const Report = () => {
  return (
    <main className="container py-10">
      <SEO title="Report" description="Submit health reports" canonical="/report" />
      <h1 className="text-3xl font-bold mb-4">Report moved</h1>
      <p className="text-muted-foreground mb-4">Please submit your report from the Patient Dashboard.</p>
      <Button asChild variant="hero"><a href="/dashboard">Go to Dashboard</a></Button>
    </main>
  );
};

export default Report;
