const SiteFooter = () => {
  return (
    <footer className="border-t mt-16">
      <div className="container py-10 grid gap-6 md:grid-cols-3">
        <div>
          <h3 className="font-semibold mb-2">Health Hub</h3>
          <p className="text-sm text-muted-foreground">Collaborative care for every community.</p>
        </div>
    
        <div className="text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Health Hub. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
