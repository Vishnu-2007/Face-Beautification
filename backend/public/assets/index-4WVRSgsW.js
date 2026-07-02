(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e={isLoggedIn:!!localStorage.getItem(`user`),theme:`light`,files:{image:null,reference:null}};document.addEventListener(`DOMContentLoaded`,()=>{a(),o(),t(),s(),r(),e.isLoggedIn&&(l(),n())});function t(){let t=document.getElementById(`auth-btn`),n=document.getElementById(`user-profile-trigger`);e.isLoggedIn?(t&&t.classList.add(`hidden`),n&&n.classList.remove(`hidden`)):(t&&(t.classList.remove(`hidden`),t.onclick=()=>window.location.href=`/login.html`),n&&n.classList.add(`hidden`))}function n(){let e=localStorage.getItem(`user`);if(!e)return;let t=JSON.parse(e),n=t.name&&t.name!==`User`?t.name:t.name||`AI Beauty`,r=document.getElementById(`user-display-name`),i=document.getElementById(`user-display-email`);r&&(r.textContent=n),i&&(i.textContent=t.email);let a=document.querySelector(`.hero-title`);a&&n!==`AI Beauty`&&(a.innerHTML=`Welcome Back, <span class="glow-text">${n.split(` `)[0]}</span>`)}function r(){let e=document.getElementById(`user-profile-trigger`),t=document.getElementById(`dashboard-overlay`),n=document.querySelector(`.close-dashboard`),r=document.querySelectorAll(`.dash-tab`),a=document.querySelector(`.logout-tab`),o=document.getElementById(`show-pass-update`),s=document.getElementById(`password-update-box`),c=document.getElementById(`confirm-pass-update`);e&&(e.onclick=()=>t.classList.remove(`hidden`)),n&&(n.onclick=()=>t.classList.add(`hidden`)),a&&(a.onclick=i),o&&(o.onclick=()=>{s.classList.toggle(`hidden`),o.textContent=s.classList.contains(`hidden`)?`Update Password`:`Cancel`}),c&&(c.onclick=async()=>{let e=document.getElementById(`old-pass`).value,t=document.getElementById(`new-pass`).value,n=localStorage.getItem(`token`);if(!e||!t){alert(`Please fill in both password fields.`);return}try{let r=await fetch(`http://localhost:5000/api/auth/update-password`,{method:`POST`,headers:{"Content-Type":`application/json`,Authorization:`Bearer ${n}`},body:JSON.stringify({oldPassword:e,newPassword:t})}),i=await r.json();r.ok?(alert(`Password updated successfully!`),s.classList.add(`hidden`),o.textContent=`Update Password`,document.getElementById(`old-pass`).value=``,document.getElementById(`new-pass`).value=``):alert(i.message||`Update failed`)}catch(e){console.error(`Password update error:`,e),alert(`Could not connect to server.`)}}),r.forEach(e=>{e.addEventListener(`click`,()=>{if(e.classList.contains(`logout-tab`))return;r.forEach(e=>e.classList.remove(`active`)),e.classList.add(`active`);let t=e.dataset.tab;document.querySelectorAll(`.tab-pane`).forEach(e=>e.classList.remove(`active`));let n=document.getElementById(`tab-${t}`);n&&n.classList.add(`active`)})}),t&&(t.onclick=e=>{e.target===t&&t.classList.add(`hidden`)})}function i(){localStorage.removeItem(`user`),localStorage.removeItem(`token`),window.location.href=`/`}function a(){let e=new IntersectionObserver(e=>{e.forEach(e=>{e.isIntersecting&&e.target.classList.add(`fade-up-active`)})},{threshold:.1,rootMargin:`0px 0px -50px 0px`});document.querySelectorAll(`section, .feature-card, .price-card, .analysis-card`).forEach(t=>{t.classList.add(`fade-up`),e.observe(t)});let t=document.querySelector(`.glass-nav`);t&&window.addEventListener(`scroll`,()=>{window.scrollY>50?(t.style.padding=`8px 24px`,t.style.background=`rgba(255, 255, 255, 0.9)`):(t.style.padding=`12px 32px`,t.style.background=`var(--glass-bg)`)})}function o(){let e=document.getElementById(`neural-canvas`);if(e)for(let t=0;t<20;t++){let t=document.createElement(`div`);t.className=`neural-dot`,t.style.left=`${Math.random()*100}%`,t.style.top=`${Math.random()*100}%`,t.style.animationDelay=`${Math.random()*5}s`,e.appendChild(t)}}function s(){let t=document.getElementById(`get-started`);t&&t.addEventListener(`click`,()=>{e.isLoggedIn?window.location.href=`/studio.html`:window.location.href=`/login.html`})}var c=document.createElement(`style`);c.textContent=`
    .fade-up {
        opacity: 0;
        transform: translateY(40px);
        transition: all 1s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .fade-up-active {
        opacity: 1;
        transform: translateY(0);
    }
    .neural-dot {
        position: absolute;
        width: 4px;
        height: 4px;
        background: var(--primary);
        border-radius: 50%;
        opacity: 0.1;
        animation: float-neural 10s infinite alternate ease-in-out;
    }
    @keyframes float-neural {
        from { transform: translate(0, 0); }
        to { transform: translate(100px, 100px); }
    }
`,document.head.appendChild(c);async function l(){let e=localStorage.getItem(`token`),t=document.getElementById(`history-list`);if(!(!e||!t))try{let n=await(await fetch(`http://localhost:5000/api/user/history`,{headers:{Authorization:`Bearer ${e}`}})).json();if(n.length>0){t.innerHTML=n.map(e=>`
                <div class="history-item tilt-3d">
                    <img src="http://localhost:5000/uploads/${e.beautified_image}" alt="Beautified">
                    <div class="history-info">
                        <span>${new Date(e.timestamp).toLocaleDateString()}</span>
                    </div>
                </div>
            `).join(``);let e=document.querySelector(`.badge`);e&&(e.textContent=`${n.length} Transformations Saved`)}}catch(e){console.error(`Failed to fetch history`,e)}}