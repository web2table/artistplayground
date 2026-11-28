'use client';

export default function MaintenanceScreen({ message }: { message?: string }) {
  return (
    <main className="ap-maintenance">
      <div className="ap-maintenance-light" aria-hidden="true" />
      <div className="ap-maintenance-curtain ap-maintenance-curtain-left" aria-hidden="true" />
      <div className="ap-maintenance-curtain ap-maintenance-curtain-right" aria-hidden="true" />
      <div className="ap-maintenance-content">
        <p className="ap-maintenance-brand">ARTIST PLAYGROUND</p>
        <div className="ap-maintenance-rule" />
        <p className="ap-maintenance-status"><span /> WEBSITE UNDER MAINTENANCE</p>
        <h1>Something wonderful<br /><em>is in the works.</em></h1>
        <p className="ap-maintenance-copy">{message || 'We are making improvements to our website. We will be back soon. Thank you for your patience!'}</p>
        <div className="ap-maintenance-divider"><span /></div>
        <p className="ap-maintenance-tagline">A space for talent at every stage.</p>
        <p className="ap-maintenance-foot">WHERE CREATION IS ALWAYS AN ARTISTIC PROCESS.</p>
      </div>
      <div className="ap-maintenance-stage-edge" aria-hidden="true" />
      <style>{`
        .ap-maintenance{position:fixed;inset:0;z-index:99999;width:100vw;height:100vh;height:100dvh;min-height:100svh;box-sizing:border-box;overflow:hidden;display:grid;place-items:center;padding:clamp(2rem,6vh,5rem) clamp(1.25rem,5vw,5rem);background:radial-gradient(ellipse at 50% 46%,#29231b 0%,#151311 34%,#090909 72%,#050505 100%);color:#f7f5ef;font-family:Manrope,Inter,sans-serif}
        .ap-maintenance-content{position:relative;z-index:3;width:min(100%,850px);text-align:center}
        .ap-maintenance-light{position:absolute;z-index:1;top:-20%;left:50%;transform:translateX(-50%);width:min(1000px,90vw);height:125%;background:linear-gradient(180deg,#e9d18a18 0%,#d8bd6210 36%,transparent 78%);clip-path:polygon(43% 0,57% 0,100% 100%,0 100%);filter:blur(24px);pointer-events:none}
        .ap-maintenance-curtain{position:absolute;z-index:2;top:-2%;bottom:-2%;width:clamp(55px,12vw,190px);background:repeating-linear-gradient(90deg,#10090a 0,#241012 12px,#381b1d 22px,#1a0d0f 34px,#10090a 46px);box-shadow:inset -18px 0 35px #0009,0 0 65px #000b;pointer-events:none}
        .ap-maintenance-curtain-left{left:0;clip-path:polygon(0 0,100% 0,82% 100%,0 100%)}
        .ap-maintenance-curtain-right{right:0;transform:scaleX(-1);clip-path:polygon(0 0,100% 0,82% 100%,0 100%)}
        .ap-maintenance-brand{font-size:clamp(.7rem,1vw,.86rem);letter-spacing:.36em;font-weight:800;margin:0 0 1.2rem}
        .ap-maintenance-rule{height:1px;width:58px;background:#d8bd62;margin:0 auto 1.7rem;box-shadow:0 0 14px #d8bd6280}
        .ap-maintenance-status{display:inline-flex;align-items:center;gap:.6rem;border:1px solid #65552e;border-radius:99px;padding:.55rem 1rem;color:#e0c66f;font-size:.65rem;letter-spacing:.18em;font-weight:800;background:#0b0a08a8}
        .ap-maintenance-status span{width:6px;height:6px;border-radius:50%;background:#e0c66f;box-shadow:0 0 12px #e0c66f}
        .ap-maintenance h1{font-size:clamp(2.7rem,7vw,6.4rem);line-height:1.02;letter-spacing:-.06em;margin:clamp(2rem,5vh,3.5rem) 0 1.5rem;font-weight:600;text-shadow:0 5px 35px #0009}
        .ap-maintenance h1 em{font-family:Georgia,serif;font-weight:400;color:#d8bd62}
        .ap-maintenance-copy{max-width:570px;margin:0 auto;color:#c0b9aa;font-size:clamp(.9rem,1.25vw,1.05rem);line-height:1.9}
        .ap-maintenance-divider{height:1px;width:min(240px,45vw);margin:clamp(2rem,5vh,3.2rem) auto 1.5rem;background:linear-gradient(90deg,transparent,#9d8248,transparent)}
        .ap-maintenance-divider span{display:block;width:5px;height:5px;background:#d8bd62;transform:translateY(-2px) rotate(45deg);margin:auto}
        .ap-maintenance-tagline{margin:0 0 .65rem;color:#eee7d8;font-size:clamp(.82rem,1.1vw,.96rem);letter-spacing:.04em}
        .ap-maintenance-foot{margin:0;color:#8d8063;font-size:.62rem;letter-spacing:.24em}
        .ap-maintenance-stage-edge{position:absolute;z-index:1;bottom:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent 5%,#725d32 50%,transparent 95%);box-shadow:0 0 30px #d8bd6230}
        @media(max-width:600px){.ap-maintenance{padding:2rem 1.15rem}.ap-maintenance-curtain{width:clamp(28px,8vw,52px);opacity:.75}.ap-maintenance-brand{letter-spacing:.25em}.ap-maintenance h1{font-size:clamp(2.35rem,11vw,4rem);margin:2rem 0 1.1rem}.ap-maintenance-copy{max-width:330px;font-size:.88rem}.ap-maintenance-foot{font-size:.48rem;letter-spacing:.16em}}
        @media(max-height:650px){.ap-maintenance{padding-top:1rem;padding-bottom:1rem}.ap-maintenance h1{font-size:clamp(2.2rem,7vh,4.4rem);margin:1.2rem 0 1rem}.ap-maintenance-divider{margin:1.3rem auto 1rem}.ap-maintenance-brand{margin-bottom:.7rem}.ap-maintenance-rule{margin-bottom:1rem}}
      `}</style>
    </main>
  );
}
