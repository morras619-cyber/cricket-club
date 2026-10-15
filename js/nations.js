// Where the players come from: the cricket nations, their flags, and name pools for the
// academy graduates who arrive each season in the career. All names are made up.
export const NATIONS = {
  IN: { name: 'India', flag: '🇮🇳',
    first: ['Aarav', 'Vihaan', 'Reyansh', 'Ishaan', 'Kartik', 'Aditya', 'Rohit', 'Sahil', 'Pranav', 'Tanmay', 'Varun', 'Yash'],
    last: ['Sharma', 'Iyer', 'Kulkarni', 'Rathore', 'Bhalla', 'Trivedi', 'Saxena', 'Nanda', 'Menon', 'Chadha', 'Grewal', 'Mathur'] },
  PK: { name: 'Pakistan', flag: '🇵🇰',
    first: ['Hamza', 'Zain', 'Talha', 'Rayyan', 'Faizan', 'Usama', 'Saad', 'Ahsan', 'Haris', 'Muneeb', 'Daniyal', 'Shayan'],
    last: ['Bajwa', 'Kazmi', 'Niazi', 'Paracha', 'Durrani', 'Jatoi', 'Hashmi', 'Zaidi', 'Malik', 'Awan', 'Gondal', 'Rind'] },
  EN: { name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    first: ['Harry', 'George', 'Alfie', 'Freddie', 'Archie', 'Theo', 'Oscar', 'Charlie', 'Toby', 'Jack', 'Sam', 'Will'],
    last: ['Pembroke', 'Hartley', 'Ashworth', 'Fairbairn', 'Whitlock', 'Cartwright', 'Holloway', 'Pritchard', 'Langley', 'Marsden', 'Thorne', 'Kendrick'] },
  AU: { name: 'Australia', flag: '🇦🇺',
    first: ['Lachlan', 'Cooper', 'Riley', 'Hudson', 'Jaxon', 'Flynn', 'Bailey', 'Mason', 'Tyler', 'Darcy', 'Hamish', 'Kai'],
    last: ['Thornton', 'McAllister', 'Doyle', 'Brennan', 'Kowalczyk', 'Hargreaves', 'Whitaker', 'Sutcliffe', 'Barlow', 'Penrith', 'Oakes', 'Cullen'] },
  NZ: { name: 'New Zealand', flag: '🇳🇿',
    first: ['Callum', 'Finn', 'Nikau', 'Lachie', 'Blake', 'Corbin', 'Tane', 'Hunter', 'Rhys', 'Logan', 'Ollie', 'Mitchell'],
    last: ['Fraser', 'Lockhart', 'Hayes', 'Te Rangi', 'McKenzie', 'Galloway', 'Ruawai', 'Ashby', 'Dunlop', 'Kerr', 'Whiu', 'Pollock'] },
  ZA: { name: 'South Africa', flag: '🇿🇦',
    first: ['Thabo', 'Sipho', 'Ruan', 'Pieter', 'Lwazi', 'Kyle', 'Jaco', 'Bongani', 'Wiaan', 'Tristan', 'Mpho', 'Dewald'],
    last: ['Mthembu', 'Nkosi', 'van Wyk', 'Pienaar', 'van der Berg', 'Botha', 'Dlamini', 'Coetzee', 'Ndlovu', 'Steyn-Louw', 'Jacobs', 'Mokoena'] },
  WI: { name: 'West Indies', flag: '🌴',
    first: ['Andre', 'Shane', 'Dwayne', 'Jermaine', 'Marlon', 'Akeem', 'Romario', 'Tevin', 'Kadeem', 'Nyron', 'Odean', 'Shamar'],
    last: ['Belgrave', 'Granger', 'Hollis', 'Alleyne', 'Greaves', 'Baptiste', 'Clarke', 'Bascombe', 'Thorpe', 'Gittens', 'Ramdeen', 'Phillip'] },
  BD: { name: 'Bangladesh', flag: '🇧🇩',
    first: ['Rakibul', 'Mahfuz', 'Ashik', 'Rafiq', 'Sajid', 'Tanvirul', 'Imon', 'Farhan', 'Rifat', 'Nazmul', 'Arif', 'Shohag'],
    last: ['Karim', 'Rahman', 'Talukder', 'Alam', 'Chowdhury', 'Sarkar', 'Bhuiyan', 'Molla', 'Sikder', 'Hossain', 'Mia', 'Khondaker'] },
  LK: { name: 'Sri Lanka', flag: '🇱🇰',
    first: ['Tharindu', 'Dinesh', 'Niroshan', 'Dilan', 'Kasun', 'Ravindu', 'Sahan', 'Isuru', 'Chathura', 'Nuwan', 'Malith', 'Sandun'],
    last: ['Jayasena', 'Wickramasinghe', 'Silva', 'Wijesekara', 'Gunawardena', 'Ekanayake', 'Rajapaksa-Perera', 'Bandara', 'Fonseka', 'Dissanayake', 'Herath-Senevi', 'Kumara'] },
  AF: { name: 'Afghanistan', flag: '🇦🇫',
    first: ['Hamid', 'Farid', 'Zubair', 'Naveed', 'Qais', 'Sharif', 'Javed', 'Wahid', 'Bilal', 'Asad', 'Fazal', 'Sami'],
    last: ['Noorzai', 'Jalali', 'Safi', 'Popalzai', 'Wardak', 'Kakar', 'Ahmadzai', 'Hotak', 'Barakzai', 'Mohmand', 'Shinwari', 'Tarakai'] },
  IE: { name: 'Ireland', flag: '🇮🇪',
    first: ['Finn', 'Liam', 'Cian', 'Oisin', 'Conor', 'Rory', 'Eoin', 'Darragh', 'Niall', 'Seamus', 'Ciaran', 'Tadhg'],
    last: ['Gallagher', 'Buckley', 'Doherty', 'Brennan', 'Kavanagh', 'Mulligan', 'Quinlan', 'Devlin', 'Tierney', 'Harte', 'Moran', 'Keane'] },
  ZW: { name: 'Zimbabwe', flag: '🇿🇼',
    first: ['Tendai', 'Tinashe', 'Blessing', 'Kudzai', 'Tafadzwa', 'Farai', 'Nyasha', 'Takudzwa', 'Ryan', 'Simba', 'Tapiwa', 'Brendan'],
    last: ['Moyo', 'Chikowore', 'Ncube', 'Mutasa', 'Sibanda', 'Mhlanga', 'Chinoda', 'Gumbo', 'Makoni', 'Dube', 'Marowa', 'Zvobgo'] },
};
// how often each nation turns up in an academy intake
export const NATION_WEIGHTS = { IN: 18, PK: 14, EN: 12, AU: 12, ZA: 9, NZ: 8, WI: 8, BD: 7, LK: 6, AF: 4, IE: 1, ZW: 1 };
export const nation = code => NATIONS[code] || null;
export const flag = p => NATIONS[p?.nation]?.flag || '';
export const nationName = p => NATIONS[p?.nation]?.name || '';
export function pickNation(rng) {
  const total = Object.values(NATION_WEIGHTS).reduce((a, b) => a + b, 0);
  let r = rng.next() * total;
  for (const [k, w] of Object.entries(NATION_WEIGHTS)) if ((r -= w) <= 0) return k;
  return 'IN';
}
