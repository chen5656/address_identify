async function standardizeAndValidateAddress(address) {
    return {
"confidenceScore": 0.7999999999999999,
"lat": 43.04680339999999,
"lon": -76.1479982,
"parcelCentroid": null,
"parcelDetails": null,
"parcel_match": {
"features": [
{
"geometry": {
  "coordinates": [
    [
      [
        -76.1476195211959,
        43.046335921459
      ],
      [
        -76.1486970617787,
        43.0463450416646
      ],
      [
        -76.1486889873379,
        43.0469411544697
      ],
      [
        -76.1476106886688,
        43.0469319510482
      ],
      [
        -76.1476195211959,
        43.046335921459
      ]
    ]
  ],
  "type": "Polygon"
},
"id": "37028",
"properties": {
  "ACRES": 1.41,
  "ACRES_1": 1.41,
  "ADDRESSNAM": "Montgomery St To State St",
  "ADDRESSNUM": "401",
  "Add1": "C/O ONON CTY FACILITIES M",
  "Add2": "ROOM  40",
  "Add3": "421 MONTGOMERY ST",
  "Add4": "SYRACUSE  NY",
  "Amount_Del": 0,
  "AssessedLa": 932400,
  "AssessedVa": 6520000,
  "Assessment": 1,
  "Bankruptcy": " ",
  "BlockLevel": "400 MONTGOMERY ST",
  "Census": 32,
  "CommonCoun": 4,
  "CountyLeg": 8,
  "DEEDBOOK": " ",
  "DEEDPAGE": " ",
  "DEPTH": 286.62,
  "DEPTH_1": 286.62,
  "DOCE_Area": "10",
  "DVDATE": 0,
  "EASTGRID": 616234,
  "FID": 37029,
  "FRONTFEET": 214.5,
  "FRONTFEE_1": 214.5,
  "FullAddres": "401 MONTGOMERY ST TO STATE ST",
  "IPSConditi": " ",
  "IPSVacant": " ",
  "LUCODE": "652",
  "Label": " ",
  "LandUse": "Community Services",
  "Latitude": 1110371.4257,
  "Latitude_1": 43.0466,
  "Longitud_1": -76.1482,
  "Longitude": 936533.805005,
  "NARRATIVE1": "Lot Nl 1&2 Bl126",
  "NARRATIVE2": " ",
  "NARRATIVE3": "214.50x286.62x214.50x282.",
  "NEWPROPCLA": "652",
  "NORTHGRID": 1110330,
  "NRSA": " ",
  "Neighborho": "Downtown",
  "OBJECTID": 375288,
  "Occupancy": "Occupied Community",
  "OpenCodeVi": " ",
  "OverdueWat": 0,
  "Owner": "COUNTY OF ONONDAGA",
  "Owner2": " ",
  "PNUMBR": "1562100900",
  "PRINTKEY": "102.-10-01.0",
  "Phase": " ",
  "Redemption": 0,
  "SBL": "102.-10-01.0",
  "SENIOR_EXE": " ",
  "STAR": " ",
  "STARC": 0,
  "STARS": 0,
  "Sec_Block": "3115001020000010",
  "Seizable": " ",
  "Shape__Area": 10896.37109375,
  "Shape__Length": 421.607061179638,
  "StName": "MONTGOMERY ST TO STATE ST",
  "StNum": "401",
  "TAX_ID": "31150010200000100010000000",
  "TAX_ID_1": "31150010200000100010000000",
  "TNT": "Downtown",
  "TaxBilling": "ROOM 40 421 MONTGOMERY ST SYRACUSE NY 13202",
  "TaxTrust": " ",
  "Units": 0,
  "VET_EXEMPT": " ",
  "VacantBuil": "N",
  "Ward": 15,
  "WaterServi": "A",
  "XCoord": 936533.805005,
  "YCoord": 1110371.4257,
  "YEARBLT": 0,
  "YearBuilt": "1900",
  "ZIP": "13202",
  "ZIP2": " ",
  "Zoning": "CBD-OSR",
  "n_OpenViol": " "
},
"type": "Feature"
}
],
"type": "FeatureCollection"
},
"standardizedAddress": "401 Montgomery st, Syracuse, NY 13202",
"summary": [
"Base Score for Location Match: 0.5",
"Street Number Match: 0.2",
"ZIP Code Match: 0.1"
]
}
    
    const response = await fetch('http://127.0.0.1:5000/api/standardize_and_validate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ address })
    });
    const data = await response.json();
    return data;
}
