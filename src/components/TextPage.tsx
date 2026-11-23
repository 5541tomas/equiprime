export default function TextPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="font-serif text-5xl">{title}</h1>
      <div className="prose-shop mt-8 space-y-4 leading-relaxed text-ink/85">{children}</div>
    </div>
  );
}
