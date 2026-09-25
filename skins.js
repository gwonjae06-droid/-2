// NPC three-round challenge and local cosmetic rewards. Load AFTER js/app.js.
(() => {
  'use strict';
  const KEY = 'ochams-skins-v1';
  const SKINS = Object.freeze({
    storm: { name: '뇌운', symbol: '⚡', description: '번개와 뇌운이 감도는 외형' },
    rewind: { name: '역행', symbol: '⏳', description: '시간의 잔광이 흐르는 외형' }
  });
  const ROUNDS = [
    { name: '단단한 방어선', ids: ['park', 'bae', 'oh'] },
    { name: '혼돈의 마도단', ids: ['boingo', 'choi', 'yoon'] },
    { name: '시간을 넘는 질주', ids: ['lee', 'sungwon_time', 'park'] }
  ];
  const blank = () => ({ claimed: false, pending: false, unlocked: [], equipped: {} });
  let state = blank();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && typeof saved === 'object') {
      state.claimed = saved.claimed === true;
      state.pending = saved.pending === true && !state.claimed;
      state.unlocked = Array.isArray(saved.unlocked) ? saved.unlocked.filter(id => Object.hasOwn(SKINS, id)) : [];
      state.equipped = saved.equipped && typeof saved.equipped === 'object' ? saved.equipped : {};
    }
  } catch (err) { console.warn('스킨 저장 상태를 읽지 못했습니다.', err); }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (err) { console.warn('스킨 저장을 사용할 수 없습니다.', err); }
  }
  let active = false;
  let round = 0;
  const style = document.createElement('style');
  style.textContent = `
    .challenge-btn { width:100%; min-height:41px; background:#7c3aed!important; }
    .skin-entry-btn { min-height:38px; background:#334155!important; }
    .skin-modal { position:fixed; inset:0; z-index:200; display:flex; align-items:center; justify-content:center; padding:14px; background:#050a15dd; }
    .skin-modal-card { width:min(440px,100%);max-height:88vh;overflow-y:auto;background:#17243a;color:#f8fafc;border:1px solid #70d6ed;border-radius:14px;padding:17px;box-shadow:0 20px 70px #000a; }
    .skin-modal-card h2 {font-size:17px;margin-bottom:9px;color:#a5f3fc;}
    .skin-modal-card p {font-size:12px;line-height:1.55;color:#cbd5e1;margin:0 0 11px;}
    .skin-choice {display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid #45617c;border-radius:9px;background:#223450;margin:7px 0;padding:9px;font-size:12px;}
    .skin-choice button {flex:0 0 auto;min-width:64px;padding:5px 9px;min-height:32px;}
    .skin-close {width:100%;margin-top:10px;background:#40526b!important;}
    .char-sprite[data-skin="storm"] .skin-aura {border-color:#fef08a;box-shadow:0 0 24px 7px #38bdf8aa,inset 0 0 18px #fef08a66;animation:skinStorm 1.4s ease-in-out infinite;}
    .char-sprite[data-skin="rewind"] .skin-aura {border-color:#a5f3fc;box-shadow:0 0 24px 7px #c084fcaa,inset 0 0 18px #a5f3fc66;animation:skinRewind 2.2s ease-in-out infinite;}
    .char-sprite .skin-aura {position:absolute;inset:-10px;border:3px solid transparent;border-radius:inherit;pointer-events:none;z-index:3;display:flex;align-items:flex-start;justify-content:flex-end;font-size:18px;}
    .pick-portrait[data-skin="storm"],.pick-portrait[data-skin="rewind"] {outline:2px solid #a5f3fc;box-shadow:0 0 12px #7dd3fcaa;}
    .pick-portrait[data-skin="rewind"] {outline-color:#e9d5ff;box-shadow:0 0 12px #d8b4feaa;}
    @keyframes skinStorm {0%,100%{opacity:.65}50%{opacity:1;box-shadow:0 0 30px 10px #facc1588,inset 0 0 18px #fef08a88}}
    @keyframes skinRewind {0%,100%{opacity:.68;transform:rotate(-5deg)}50%{opacity:1;transform:rotate(5deg)}}
    @media (prefers-reduced-motion:reduce) {.char-sprite .skin-aura{animation:none!important;}}
  `;
  document.head.appendChild(style);

  function paintedSkin(characterId) {
    const value = state.equipped[characterId];
    return state.unlocked.includes(value) && Object.hasOwn(SKINS, value) ? value : '';
  }
  function decorateSprite(sprite, characterId) {
    if (!sprite) return;
    const id = paintedSkin(characterId);
    if (id) sprite.dataset.skin = id;
    else delete sprite.dataset.skin;
    let aura = sprite.querySelector('.skin-aura');
    if (!aura) {
      aura = document.createElement('span');
      aura.className = 'skin-aura';
      aura.setAttribute('aria-hidden', 'true');
      sprite.appendChild(aura);
    }
    aura.textContent = id ? SKINS[id].symbol : '';
  }
  function paint() {
    if (typeof myTeam !== 'undefined' && myTeam && myTeam.lead) {
      decorateSprite(document.getElementById('player-sprite'), myTeam.lead.id);
    }
    for (const id of Object.keys(POKEDEX)) {
      const portrait = document.querySelector(`#card-${id} .pick-portrait`);
      if (portrait) {
        const skin = paintedSkin(id);
        if (skin) portrait.dataset.skin = skin;
        else delete portrait.dataset.skin;
      }
    }
  }
  function modal(title, description) {
    const overlay = document.createElement('div');
    overlay.className = 'skin-modal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    const card = document.createElement('div');
    card.className = 'skin-modal-card';
    const heading = document.createElement('h2');
    heading.textContent = title;
    const p = document.createElement('p');
    p.textContent = description;
    card.append(heading, p);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    return { overlay, card };
  }
  function row(card, description, buttonLabel, action) {
    const item = document.createElement('div');
    item.className = 'skin-choice';
    const label = document.createElement('span');
    label.textContent = description;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = buttonLabel;
    button.addEventListener('click', action);
    item.append(label, button);
    card.appendChild(item);
  }
  function closeButton(card, overlay) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'skin-close';
    button.textContent = '닫기';
    button.addEventListener('click', () => overlay.remove());
    card.appendChild(button);
  }
  function offerReward() {
    if (!state.pending || state.claimed) return;
    if (document.querySelector('.skin-modal')) return;
    const {overlay,card} = modal('🏆 3연전 첫 승리 보상', '스킨 하나를 골라 해금하세요. 스탯과 기술 판정은 바뀌지 않습니다.');
    for (const [id, skin] of Object.entries(SKINS)) {
      row(card, `${skin.symbol} ${skin.name} · ${skin.description}`, '받기', () => {
        state.pending = false;
        state.claimed = true;
        state.unlocked = [id];
        if (myTeam && myTeam.lead) state.equipped[myTeam.lead.id] = id;
        persist(); paint(); overlay.remove();
        const msg = document.getElementById('battle-msg');
        if (msg) msg.textContent = `${skin.name} 스킨을 해금했습니다! 로비의 스킨 버튼에서 장착할 수 있습니다.`;
      });
    }
    closeButton(card,overlay);
  }
  function openWardrobe() {
    const {overlay,card} = modal('🎨 스킨 보관함', '해금한 스킨을 캐릭터별로 장착할 수 있습니다. 이 브라우저에 저장됩니다.');
    if (!state.unlocked.length) {
      const p=document.createElement('p');
      p.textContent='아직 해금된 스킨이 없습니다. NPC 3연전을 처음 클리어해 보세요.';
      card.appendChild(p);
    } else {
      for (const [id, character] of Object.entries(POKEDEX)) {
        const heading=document.createElement('p');
        heading.textContent=`${character.name} · 현재: ${SKINS[paintedSkin(id)]?.name || '기본'}`;
        card.appendChild(heading);
        const choices=[['', '기본'], ...state.unlocked.map(skinId => [skinId, SKINS[skinId].name])];
        for (const [skinId, label] of choices) {
          row(card, label, paintedSkin(id)===skinId?'장착 중':'장착', () => {
            if (skinId) state.equipped[id]=skinId;
            else delete state.equipped[id];
            persist(); paint(); overlay.remove(); openWardrobe();
          });
        }
      }
    }
    closeButton(card,overlay);
  }
  const lobby=document.getElementById('lobby-panel');
  if (lobby) {
    const button=document.createElement('button');
    button.type='button';button.className='ai-btn challenge-btn';
    button.textContent='🏆 NPC 3연전 도전';
    lobby.appendChild(button);
    const normalStart=window.startAiMode;
    window.startAiMode=function(...args){active=false;round=0;return normalStart.apply(this,args);};
    button.addEventListener('click', () => {
      active=true;round=1;normalStart();
      const status=document.getElementById('net-status');
      if (status) status.textContent=`NPC 3연전 · 1/3: ${ROUNDS[0].name} — 캐릭터 3명을 고르세요.`;
    });
  }
  const picks=document.getElementById('pick-panel');
  if (picks) {
    const button=document.createElement('button');
    button.type='button';button.className='skin-entry-btn';button.textContent='🎨 스킨 보관함';
    button.addEventListener('click',openWardrobe);
    picks.appendChild(button);
  }
  const normalConfirm=window.confirmTeam;
  window.confirmTeam=function(...args) {
    if (!active || !isAiMode) return normalConfirm.apply(this,args);
    if (myPickList.length!==3) { alert('캐릭터 3명을 선택해 주세요.'); return; }
    myTeam={lead:buildMon(myPickList[0],myPickList[0]==='sungwon_time'?sungwonSelectedForm:null),
      bench:myPickList.slice(1).map(id=>buildMon(id,id==='sungwon_time'?sungwonSelectedForm:null))};
    enemyTeam=makeOpponent(round);
    startBattleScreen();
  };
  function makeOpponent(index) {
    const ids=ROUNDS[index-1].ids;
    return {lead:buildMon(ids[0],ids[0]==='sungwon_time'?'high':null),
      bench:ids.slice(1).map(id=>buildMon(id,id==='sungwon_time'?'high':null))};
  }
  const normalGameOver=window.showGameOverMenu;
  window.showGameOverMenu=function(outcome) {
    const alreadyFinished=matchEnded;
    const result=normalGameOver.call(this,outcome);
    if (alreadyFinished || !active || !isAiMode) return result;
    const menu=document.getElementById('menu-gameover');
    if (outcome==='win' && round<ROUNDS.length) {
      const next=document.createElement('button');
      next.type='button';next.className='btn-restart';
      next.textContent=`다음 경기 (${round+1}/${ROUNDS.length}): ${ROUNDS[round].name}`;
      next.addEventListener('click', () => {
        round++;
        const ids=myPickList;
        myTeam={lead:buildMon(ids[0],ids[0]==='sungwon_time'?sungwonSelectedForm:null),
          bench:ids.slice(1).map(id=>buildMon(id,id==='sungwon_time'?sungwonSelectedForm:null))};
        enemyTeam=makeOpponent(round);
        startBattleScreen();
      });
      menu.appendChild(next);
    } else {
      if (outcome==='win' && !state.claimed) {
        state.pending=true;persist();offerReward();
      }
      active=false;round=0;
    }
    return result;
  };
  const normalRestart=window.restartToLobby;
  window.restartToLobby=function(...args){active=false;round=0;return normalRestart.apply(this,args);};
  const normalRender=window.renderBattleField;
  window.renderBattleField=function(...args){const result=normalRender.apply(this,args);paint();return result;};
  const normalPicks=window.updatePickVisuals;
  window.updatePickVisuals=function(...args){const result=normalPicks.apply(this,args);paint();return result;};
  paint();
  if (state.pending) queueMicrotask(offerReward);
})();
