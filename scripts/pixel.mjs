// Meta Pixel "outrr" (2307680780051131), placed in the <head> of every outrr.in page.
// track.js (ad tags from admin → Marketing) skips its own init when this pixel is already on the page.
export const PIXEL_ID = '2307680780051131'
export const PIXEL_HEAD = `<!-- Meta Pixel -->
<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');window.__outrrPixel='${PIXEL_ID}';fbq('init','${PIXEL_ID}');fbq('track','PageView');</script>
<!-- End Meta Pixel -->`
// add to an HTML page once, right after <head>
export const withPixel = html => html.includes("window.__outrrPixel") ? html : html.replace(/<head>/i, m => `${m}\n${PIXEL_HEAD}`)
