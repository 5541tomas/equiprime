// Campanha sazonal. Para desligar, mude `active` para false (ou deixe passar a data `until`).
export const CHRISTMAS = {
  active: true,
  until: "2026-12-25T00:00:00+00:00",
  // ⚠️ Confirmar estas datas com os prazos dos CTT
  deadlineMainland: "16 de dezembro",
  deadlineIslandsEurope: "10 de dezembro",
};

export const christmasOn = () => CHRISTMAS.active && Date.now() < Date.parse(CHRISTMAS.until);
