import { useEffect } from "react";
import { JsonLd } from "@/lib/seo/JsonLd";
import {
  parseCustomJsonLd,
  type SiteScriptsSettings,
} from "@/lib/platform/site-scripts.shared";

type Props = {
  scripts: SiteScriptsSettings;
};

function isValidGa(id: string) {
  return /^G-[A-Z0-9]+$/i.test(id.trim());
}

function isValidGtm(id: string) {
  return /^GTM-[A-Z0-9]+$/i.test(id.trim());
}

function injectHtmlFragment(
  html: string,
  target: ParentNode,
  markerAttr: string,
): () => void {
  const wrap = document.createElement("div");
  wrap.innerHTML = html;
  const injected: Node[] = [];

  for (const node of Array.from(wrap.childNodes)) {
    if (node.nodeName.toLowerCase() === "script") {
      const srcEl = node as HTMLScriptElement;
      const script = document.createElement("script");
      for (const attr of Array.from(srcEl.attributes)) {
        script.setAttribute(attr.name, attr.value);
      }
      script.text = srcEl.textContent || "";
      script.setAttribute(markerAttr, "1");
      target.appendChild(script);
      injected.push(script);
    } else {
      const clone = node.cloneNode(true);
      if (clone instanceof Element) clone.setAttribute(markerAttr, "1");
      target.appendChild(clone);
      injected.push(clone);
    }
  }

  return () => {
    for (const n of injected) n.parentNode?.removeChild(n);
  };
}

/**
 * Injects GA4, GTM, custom head/body HTML, and optional extra JSON-LD sitewide.
 */
export function SiteTrackingScripts({ scripts }: Props) {
  const ga = scripts.gaMeasurementId.trim().toUpperCase();
  const gtm = scripts.gtmContainerId.trim().toUpperCase();
  const extraLd = parseCustomJsonLd(scripts.customJsonLd);

  useEffect(() => {
    const cleanups: Array<() => void> = [];
    if (scripts.customHeadHtml.trim()) {
      cleanups.push(
        injectHtmlFragment(scripts.customHeadHtml, document.head, "data-eva-custom-head"),
      );
    }
    if (scripts.customBodyHtml.trim()) {
      cleanups.push(
        injectHtmlFragment(scripts.customBodyHtml, document.body, "data-eva-custom-body"),
      );
    }
    return () => {
      for (const fn of cleanups) fn();
    };
  }, [scripts.customHeadHtml, scripts.customBodyHtml]);

  return (
    <>
      {isValidGa(ga) ? (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} />
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga}');`,
            }}
          />
        </>
      ) : null}

      {isValidGtm(gtm) ? (
        <>
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`,
            }}
          />
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtm}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
              title="Google Tag Manager"
            />
          </noscript>
        </>
      ) : null}

      {extraLd ? <JsonLd data={extraLd} /> : null}
    </>
  );
}
