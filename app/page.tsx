import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tarelog — Know what you eat",
  description: "A private food journal for recording real meals and seeing long-term patterns.",
};

const githubUrl = "https://github.com/zhangboy03/tarelog";

export default function Home() {
  return <main className="minimal-site">
    <header className="minimal-nav">
      <Link className="minimal-brand" href="/">Tarelog</Link>
      <nav aria-label="Project navigation">
        <a href={githubUrl}>GitHub</a>
        <Link href="/journal">Journal</Link>
      </nav>
    </header>

    <section className="minimal-hero">
      <div className="minimal-copy">
        <h1>Know what you eat.<br /><span>Live a little better.</span></h1>
        <p>A private food journal for real meals and long-term patterns.</p>
        <div className="minimal-actions">
          <Link className="minimal-primary" href="/journal">Open journal</Link>
          <a className="minimal-secondary" href={githubUrl}>View source ↗</a>
        </div>
      </div>

      <figure className="minimal-visual">
        <Image
          src="/tarelog-scale.png"
          alt="A real digital kitchen scale weighing 440 grams of Chinese yam"
          width={1200}
          height={630}
          priority
        />
      </figure>
    </section>

    <section className="minimal-handoff">
      <h2>One meal is a moment.<br />Many meals make a pattern.</h2>
      <div>
        <blockquote>Record what happened. Check the facts. Look back when it matters.</blockquote>
        <nav aria-label="Get started">
          <Link href="/journal">Use Tarelog →</Link>
          <a href={`${githubUrl}#run-tarelog`}>Self-host ↗</a>
        </nav>
      </div>
    </section>
  </main>;
}
