const seconds = 12_345;
const ms = 12_345_000;

interface Event {
//   timestamp: number;
//   event_timestamp_ms: number;
  nino: string;
  sautr: string;
  payRef: {
    taxOfficeNumber: string;
    taxOfficeReference?: string;
  };
  extensions?: object;
}

export const hmrcQuestions: {
  [key: string]: Event;
} = {
  question_one: {
    nino: 'AA000003D',
    sautr: '1234567890',
    payRef: {
      taxOfficeNumber: '123',
      taxOfficeReference: '4887762099'
    }
  },

};
