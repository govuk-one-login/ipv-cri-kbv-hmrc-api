export type checkDetailsType = {
  checkMethod: string;
  kbvResponseMode: string;
  kbvQuality?: number;
};
export const checkDetails = {
  checkMethod: "kbv",
  kbvResponseMode: "free_text",
  kbvQuality: 3,
};
export const failedCheckDetails = {
  checkMethod: "kbv",
  kbvResponseMode: "free_text",
};
