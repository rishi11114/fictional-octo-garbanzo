import { SEO } from "@/components/SEO";

const modules = [
  { title: "Nutrition Basics", slug: "Nutrition", lang: "EN / HI" },
  { title: "Everyday Exercise", slug: "Exercise", lang: "EN / HI" },
  { title: "Hygiene & Sanitation", slug: "Hygiene", lang: "EN / HI" },
  { title: "Mental Well-Being", slug: "Mental", lang: "EN / HI" },
];

const Education = () => {
  return (
    <main className="container py-10">
      <SEO
        title="Preventive Healthcare & Wellness Education"
        description="Interactive, multilingual content for nutrition, exercise, hygiene, and mental well-being."
        canonical="/education"
      />
      <h1 className="text-3xl font-bold mb-6">
        Preventive Healthcare & Wellness Education
      </h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <article
            key={m.slug}
            className="rounded-lg border p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="font-medium mb-1">
              <a href={`/education/${m.slug}`}>{m.title}</a>
            </h3>
            <p className="text-sm text-muted-foreground">{m.lang}</p>
          </article>
        ))}
      </div>
    </main>
  );
};

export default Education;
