(() => {
  const colors=['--app-blue','--app-blue-hover','--app-text','--app-muted','--app-line','--app-card','--app-page','--app-green','--app-red'];
  window.SIGA_QUIZ_APPEARANCE=values=>{for(const key of colors){const value=values?.[key];if(typeof value==='string'&&CSS.supports('color',value))document.documentElement.style.setProperty(key,value);}};
})();
