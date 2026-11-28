'use client';

export default function MaintenanceScreen({ message }: { message?: string }) {
  return (
    <main className="ap-maintenance">
      <div className="ap-maintenance-inner">
        <p className="ap-maintenance-brand">ARTIST PLAYGROUND</p>
        <div className="ap-maintenance-rule" />
        <p className="ap-maintenance-status"><span /> WEBSITE UNDER MAINTENANCE</p>
        <div className="ap-maintenance-stage" aria-hidden="true">
          <div className="ap-maintenance-beam" />
          <div className="ap-maintenance-curtain ap-maintenance-curtain-left" />
          <div className="ap-maintenance-curtain ap-maintenance-curtain-right" />
          <div className="ap-maintenance-floor" />
          <div className="ap-maintenance-spotlight" />
        </div>
        <h1>Something wonderful<br /><em>is in the works.</em></h1>
        <p className="ap-maintenance-copy">{message || 'We are making improvements to our website. We will be back soon. Thank you for your patience!'}</p>
        <p className="ap-maintenance-tagline">A space for talent at every stage.</p>
        <p className="ap-maintenance-foot">WHERE CREATION IS ALWAYS AN ARTISTIC PROCESS.</p>
      </div>
      <style>{`
        .ap-maintenance{min-height:100svh;width:100%;display:grid;place-items:center;box-sizing:border-box;overflow:hidden;padding:3rem 1.25rem;background:radial-gradient(ellipse at 50% 42%,#202020 0%,#0c0c0c 48%,#050505 100%);color:#f7f5ef;font-family:Manrope,Inter,sans-serif}
        .ap-maintenance-inner{width:min(100%,760px);text-align:center;position:relative}
        .ap-maintenance-brand{font-size:.76rem;letter-spacing:.32em;font-weight:800;margin:0 0 1.1rem}
        .ap-maintenance-rule{height:1px;width:54px;background:#d8bd62;margin:0 auto 1.5rem}
        .ap-maintenance-status{display:inline-flex;align-items:center;gap:.55rem;border:1px solid #51482d;border-radius:99px;padding:.48rem .85rem;color:#d8bd62;font-size:.62rem;letter-spacing:.17em;font-weight:800}
        .ap-maintenance-status span{width:6px;height:6px;border-radius:50%;background:#d8bd62;box-shadow:0 0 12px #d8bd62}
        .ap-maintenance-stage{height:clamp(150px,26vw,220px);max-width:590px;margin:1.2rem auto 1rem;position:relative;overflow:hidden;background:linear-gradient(180deg,#111 0%,#17130f 78%,#090909 100%);border:1px solid #28231b;box-shadow:0 20px 70px #0009}
        .ap-maintenance-beam{position:absolute;top:-8%;left:50%;transform:translateX(-50%);width:72%;height:120%;background:linear-gradient(180deg,#f7e4a5 0%,#d8bd62 18%,#d8bd6200 100%);clip-path:polygon(43% 0,57% 0,100% 100%,0 100%);opacity:.22;filter:blur(7px)}
        .ap-maintenance-spotlight{position:absolute;bottom:10%;left:50%;transform:translateX(-50%);width:48%;height:24%;border-radius:50%;background:#e5c875;filter:blur(22px);opacity:.24}
        .ap-maintenance-curtain{position:absolute;top:0;height:100%;width:17%;background:repeating-linear-gradient(90deg,#170d0e 0,#32191b 12px,#170d0e 24px);box-shadow:0 0 28px #000}
        .ap-maintenance-curtain-left{left:0;clip-path:polygon(0 0,100% 0,83% 100%,0 100%)}
        .ap-maintenance-curtain-right{right:0;clip-path:polygon(0 0,100% 0,100% 100%,17% 100%)}
        .ap-maintenance-floor{position:absolute;bottom:0;left:13%;right:13%;height:2px;background:#9b8042;box-shadow:0 0 18px #d8bd6266}
        .ap-maintenance h1{font-size:clamp(2.2rem,6vw,4.4rem);line-height:1.06;letter-spacing:-.055em;margin:1.2rem 0 1rem;font-weight:600}
        .ap-maintenance h1 em{font-family:Georgia,serif;font-weight:400;color:#d8bd62}
        .ap-maintenance-copy{max-width:490px;margin:0 auto;color:#aaa69c;font-size:.92rem;line-height:1.8}
        .ap-maintenance-tagline{margin:2rem 0 .5rem;color:#e8e2d3;font-size:.8rem;letter-spacing:.04em}
        .ap-maintenance-foot{margin:0;color:#6e695e;font-size:.56rem;letter-spacing:.2em}
        @media(max-width:520px){.ap-maintenance{padding:2rem 1rem}.ap-maintenance-brand{font-size:.68rem}.ap-maintenance-stage{height:155px}.ap-maintenance-copy{font-size:.84rem}}
      `}</style>
    </main>
  );
}
