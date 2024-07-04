export type SignerPayLoad = {
  kid?: string;
  header: string;
  claimsSet: string;
  govJourneyId: string;
};
