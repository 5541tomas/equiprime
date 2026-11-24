// Campanha sazonal. Para desligar, mude `active` para false (ou deixe passar a data `until`).
export const CHRISTMAS = {
  active: true,
  until: "2026-12-25T00:00:00+00:00",
  // datas confirmadas pela loja
  deadlineMainland: "21 de dezembro",
  deadlineIslands: "16 de dezembro",
};

export const christmasOn = () => CHRISTMAS.active && Date.now() < Date.parse(CHRISTMAS.until);
