import Link from "next/link";
import { Sky } from "@/components/sky/sky";
import { T } from "@/components/t";

export default function NotFound() {
  return (
    <>
      <Sky />
      <div className="grain" aria-hidden="true" />

      <div className="frame frame--center">
        <main className="stage">
          <p className="meta">404</p>
          <h1 className="tagline">
            <T
              pt={
                <>
                  Esta página se perdeu <em>entre as estrelas</em>.
                </>
              }
              en={
                <>
                  This page is lost <em>among the stars</em>.
                </>
              }
            />
          </h1>
          <Link href="/" className="back">
            <T pt="Voltar ao início" en="Back home" />
          </Link>
        </main>
      </div>
    </>
  );
}
