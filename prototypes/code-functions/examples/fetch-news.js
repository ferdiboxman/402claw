export const config = {
  allowedHosts: ["api.coindesk.com"],
  maxDuration: 12,
};

export default async function handler(_request, ctx) {
  const response = await ctx.fetch("https://api.coindesk.com/v1/bpi/currentprice.json");
  const payload = await response.json();
  return {
    ok: true,
    updatedIso: payload?.time?.updatedISO,
    usdRate: payload?.bpi?.USD?.rate_float,
  };
}
