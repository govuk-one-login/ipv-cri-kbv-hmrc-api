export type UserInfoEvent = {
  userInfoEvent: {
    Items: [
      {
        addresses: {
          L: [
            {
              M: {
                addressCountry: {
                  S: string;
                };
                departmentName: {
                  Nul: boolean;
                };
                uprn: {
                  N: string;
                };
                postalCode: {
                  S: string;
                };
                validFrom: {
                  S: string;
                };
                subBuildingName: {
                  S: string;
                };
                buildingName: {
                  S: string;
                };
                organisationName: {
                  Nul: boolean;
                };
                streetName: {
                  S: string;
                };
                dependentStreetName: {
                  Nul: boolean;
                };
                buildingNumber: {
                  S: string;
                };
                validUntil: {
                  Nul: boolean;
                };
                addressLocality: {
                  S: string;
                };
                dependentAddressLocality: {
                  Nul: boolean;
                };
                doubleDependentAddressLocality: {
                  Nul: boolean;
                };
              };
            },
          ];
        };
        names: {
          L: [
            {
              M: {
                nameParts: {
                  L: [
                    {
                      M: {
                        type: {
                          S: string;
                        };
                        value: {
                          S: string;
                        };
                      };
                    },
                  ];
                };
              };
            },
          ];
        };
        birthDates: {
          L: [
            {
              M: {
                value: {
                  S: string;
                };
              };
            },
          ];
        };
      },
    ];
  };
};

export const mockUserInfoEventItem = {
  userInfoEvent: {
    Items: [
      {
        addresses: {
          L: [
            {
              M: {
                streetName: { S: "123 Downing St" },
                postalCode: { S: "SW11 2GH" },
                buildingNumber: { S: "10-11" },
                validFrom: { S: "2023-01-01" },
              },
            },
          ],
        },
        names: {
          L: [
            {
              M: {
                nameParts: {
                  L: [
                    { M: { type: { S: "GivenName" }, value: { S: "Rishi" } } },
                    {
                      M: { type: { S: "FamilyName" }, value: { S: "Johnson" } },
                    },
                  ],
                },
              },
            },
          ],
        },
        birthDates: {
          L: [
            { M: { value: { S: "2000-01-01" } } },
            { M: { value: { S: "1990-05-15" } } },
          ],
        },
      },
    ],
  },
};
