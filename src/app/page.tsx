import { Clock } from "@/components/clock";
import { Contact } from "@/components/contact";
import { LanguageToggle } from "@/components/language-toggle";
import { Logo, StarMark } from "@/components/logo";
import { Sky } from "@/components/sky/sky";
import { T } from "@/components/t";
import { SITE } from "@/lib/site";

export default function Home() {
  return (
    <>
      <Sky />
      <div className="grain" aria-hidden="true" />

      <div className="frame">
        <header className="bar bar--top">
          <p className="meta roll" data-hover>
            <span>{SITE.coordinates}</span>
            <span>{SITE.address}</span>
          </p>
          <LanguageToggle />
        </header>

        <main className="stage">
          <h1 data-hover>
            <Logo />
          </h1>
          <p className="tagline">
            <T
              en={
                <>
                  The partner to companies building <em>the next big thing</em> with AI
                </>
              }
              pt={
                <>
                  A parceira das empresas que estão construindo{" "}
                  <em>a próxima grande inovação</em> com IA
                </>
              }
            />
          </p>
          <Contact />
        </main>

        <footer className="bar bar--bottom">
          <p className="meta">
            São Paulo
            <Clock />
          </p>
          <p className="hint">
            <StarMark className="hint__star" />
            <T en="Press and hold the sky" pt="Segure o céu" />
          </p>
          <p className="meta">
            © {new Date().getFullYear()} {SITE.name}
          </p>
        </footer>
      </div>
    </>
  );
}
