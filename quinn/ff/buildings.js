// Buildings in the fairy world, and their insides.
//
// Each building stands on one world tile and has:
//   doors   - one or more door shapes on the outside (world) tile image
//   outside - where the fairy appears on the world tile when it leaves
//   inside  - the inside image (images/insides_reencoded/<img>.jpeg), the
//             door shape on that image that leads back out, and where the
//             fairy appears when it comes in
//
// All coordinates are normalized to the image like the fairy's own
// position: (0, 0) is the bottom-left corner and (1, 1) the top-right.
// Door shapes are polygons given as lists of [x, y] points.
//
// This file is shared by the game (game.js) and the door review page
// (doors.html), so the review page always shows exactly what the game
// uses.
window.FAIRY_BUILDINGS = [
  {
    id: 'acorn_house', name: 'Acorn Hideout', tile: [1, 1],
    doors: [[[0.395, 0.41], [0.462, 0.42], [0.463, 0.58], [0.395, 0.566]]],
    outside: [0.46, 0.34],
    inside: {
      img: 'acorn_house_inside',
      door: [[0.86, 0.2], [0.96, 0.17], [0.97, 0.5], [0.92, 0.58], [0.865, 0.53]],
      spawn: [0.8, 0.25],
    },
  },
  {
    id: 'purple_purple', name: 'Purple Purple', tile: [1, 3],
    doors: [[[0.545, 0.505], [0.64, 0.505], [0.64, 0.64], [0.595, 0.67], [0.545, 0.645]]],
    outside: [0.59, 0.43],
    inside: {
      img: 'purple_purple_inside',
      door: [[0.89, 0.1], [0.97, 0.05], [0.98, 0.48], [0.93, 0.56], [0.89, 0.5]],
      spawn: [0.78, 0.08],
    },
  },
  {
    id: 'red_an_rockin', name: "Red an' Rockin'", tile: [2, 1],
    doors: [[[0.542, 0.345], [0.602, 0.338], [0.605, 0.51], [0.542, 0.515]]],
    outside: [0.575, 0.27],
    inside: {
      img: 'red_an_rockin_inside',
      door: [[0.035, 0.07], [0.22, 0.17], [0.225, 0.62], [0.035, 0.66]],
      spawn: [0.3, 0.12],
    },
  },
  {
    // The way into House McDark is down the stairs in the stone well;
    // the way back out is up the spiral staircase.
    id: 'house_mcdark', name: 'House McDark', tile: [2, 2],
    doors: [[[0.655, 0.27], [0.7, 0.3], [0.78, 0.29], [0.8, 0.22], [0.74, 0.175], [0.67, 0.2]]],
    outside: [0.58, 0.32],
    inside: {
      img: 'house_mcdark_inside',
      door: [[0.65, 0.3], [0.76, 0.27], [0.8, 0.45], [0.78, 0.75], [0.68, 0.75], [0.66, 0.5]],
      spawn: [0.62, 0.2],
    },
  },
  {
    id: 'pumpkin_house', name: 'Wacky Pumpkin House', tile: [2, 3],
    doors: [[[0.455, 0.44], [0.53, 0.44], [0.53, 0.655], [0.455, 0.655]]],
    outside: [0.49, 0.33],
    inside: {
      img: 'pumpkin_house_inside',
      door: [[0.13, 0.2], [0.235, 0.18], [0.235, 0.6], [0.18, 0.635], [0.13, 0.62]],
      spawn: [0.28, 0.12],
    },
  },
  {
    id: 'little_one', name: 'The Little One', tile: [3, 2],
    doors: [[[0.735, 0.165], [0.78, 0.14], [0.783, 0.275], [0.735, 0.295]]],
    outside: [0.72, 0.1],
    inside: {
      img: 'little_one_inside',
      door: [[0.25, 0.18], [0.37, 0.3], [0.37, 0.63], [0.24, 0.59]],
      spawn: [0.4, 0.2],
    },
  },
  {
    id: 'woodmans_outpost', name: "Woodman's Outpost", tile: [3, 3],
    doors: [[[0.29, 0.615], [0.335, 0.625], [0.335, 0.72], [0.315, 0.74], [0.292, 0.725]]],
    outside: [0.32, 0.55],
    inside: {
      img: 'woodmans_outpost_inside',
      door: [[0.07, 0.08], [0.21, 0.2], [0.21, 0.75], [0.07, 0.82]],
      spawn: [0.28, 0.12],
    },
  },
  {
    id: 'stone_stones', name: 'Stone Stones', tile: [4, 1],
    doors: [[[0.565, 0.345], [0.607, 0.33], [0.61, 0.46], [0.588, 0.48], [0.565, 0.465]]],
    outside: [0.57, 0.25],
    inside: {
      img: 'stone_stones_inside',
      door: [[0.1, 0.07], [0.2, 0.2], [0.2, 0.7], [0.15, 0.78], [0.1, 0.73]],
      spawn: [0.26, 0.12],
    },
  },
  {
    id: 'stone_stones_little_shed', name: 'Stone Stones Tiny Shed', tile: [4, 1],
    doors: [[[0.379, 0.755], [0.407, 0.765], [0.407, 0.818], [0.379, 0.808]]],
    outside: [0.38, 0.72],
    inside: {
      img: 'stone_stones_little_shed_inside',
      door: [[0.13, 0.05], [0.27, 0.03], [0.27, 0.38], [0.13, 0.47]],
      spawn: [0.38, 0.12],
    },
  },
  {
    id: 'portopotty', name: 'Port-o-Potty', tile: [4, 2],
    doors: [[[0.545, 0.44], [0.585, 0.415], [0.62, 0.425], [0.615, 0.66], [0.58, 0.69], [0.55, 0.665]]],
    outside: [0.56, 0.33],
    inside: {
      img: 'portopotty_inside',
      door: [[0.73, 0.08], [0.8, 0.02], [0.86, 0.2], [0.86, 0.72], [0.82, 0.8], [0.75, 0.7]],
      spawn: [0.55, 0.12],
    },
  },
  {
    id: 'pink_perfect', name: 'Pink Perfect', tile: [4, 3],
    doors: [[[0.62, 0.36], [0.665, 0.33], [0.668, 0.485], [0.62, 0.495]]],
    outside: [0.62, 0.27],
    inside: {
      img: 'pink_perfect_inside',
      door: [[0.04, 0.25], [0.12, 0.27], [0.125, 0.46], [0.09, 0.48], [0.04, 0.45]],
      spawn: [0.15, 0.18],
    },
  },
  {
    id: 'purple_pink', name: 'Purple Pink House', tile: [5, 1],
    doors: [[[0.39, 0.225], [0.44, 0.2], [0.44, 0.34], [0.415, 0.385], [0.39, 0.345]]],
    outside: [0.38, 0.1],
    inside: {
      img: 'purple_pink_inside',
      door: [[0.1, 0.22], [0.175, 0.2], [0.18, 0.29], [0.14, 0.325], [0.1, 0.3]],
      spawn: [0.25, 0.12],
    },
  },
  {
    id: 'blue_tastical', name: 'Blue Tastical Homes', tile: [5, 3],
    doors: [[[0.45, 0.22], [0.545, 0.22], [0.545, 0.4], [0.5, 0.445], [0.45, 0.4]]],
    outside: [0.51, 0.13],
    inside: {
      img: 'blue_tastical_inside',
      door: [[0.11, 0.2], [0.29, 0.16], [0.3, 0.55], [0.2, 0.66], [0.11, 0.58]],
      spawn: [0.28, 0.1],
    },
  },
  {
    id: 'rainbow_house', name: 'The Rainbow House', tile: [6, 1],
    doors: [[[0.413, 0.255], [0.465, 0.235], [0.465, 0.385], [0.44, 0.4], [0.413, 0.385]]],
    outside: [0.4, 0.17],
    inside: {
      img: 'rainbow_house_inside',
      door: [[0.455, 0.34], [0.535, 0.34], [0.535, 0.57], [0.495, 0.62], [0.455, 0.57]],
      spawn: [0.49, 0.22],
    },
  },
  {
    id: 'rainbow_house_shed', name: 'Rainbow House Shed', tile: [6, 1],
    doors: [[[0.236, 0.29], [0.29, 0.31], [0.288, 0.47], [0.236, 0.455]]],
    outside: [0.24, 0.24],
    inside: {
      img: 'rainbow_house_shed_inside',
      door: [[0.745, 0.47], [0.96, 0.36], [0.965, 0.9], [0.75, 0.98]],
      spawn: [0.62, 0.35],
    },
  },
  {
    id: 'twig_fort', name: 'Twig Fort', tile: [6, 2],
    doors: [[[0.455, 0.4], [0.505, 0.405], [0.505, 0.545], [0.455, 0.535]]],
    outside: [0.48, 0.34],
    inside: {
      img: 'twig_fort_inside',
      door: [[0.64, 0.32], [0.795, 0.22], [0.8, 0.66], [0.64, 0.7]],
      spawn: [0.55, 0.2],
    },
  },
  {
    id: 'twig_fort_shed', name: 'Twig Fort Shed', tile: [6, 2],
    doors: [[[0.905, 0.475], [0.94, 0.45], [0.94, 0.555], [0.905, 0.59]]],
    outside: [0.9, 0.4],
    inside: {
      img: 'twig_fort_shed_inside',
      door: [[0.425, 0.22], [0.605, 0.22], [0.605, 0.78], [0.425, 0.78]],
      spawn: [0.5, 0.1],
    },
  },
  {
    id: 'portopotty_2', name: 'Port-o-Potty 2', tile: [6, 3],
    doors: [[[0.275, 0.48], [0.36, 0.475], [0.36, 0.71], [0.32, 0.745], [0.278, 0.71]]],
    outside: [0.31, 0.4],
    inside: {
      img: 'portopotty_2_inside',
      door: [[0.05, 0.08], [0.38, 0.08], [0.38, 0.85], [0.21, 0.97], [0.05, 0.85]],
      spawn: [0.55, 0.1],
    },
  },
  {
    id: 'fair_groth', name: 'Fair Groth', tile: [8, 1],
    doors: [[[0.44, 0.34], [0.555, 0.34], [0.555, 0.53], [0.5, 0.565], [0.44, 0.53]]],
    outside: [0.5, 0.25],
    inside: {
      img: 'fair_groth_inside',
      door: [[0.3, 0.3], [0.44, 0.32], [0.44, 0.55], [0.37, 0.6], [0.3, 0.56]],
      spawn: [0.38, 0.22],
    },
  },
  {
    // Fixyos has two ways in: the little front door and the big garage.
    id: 'fixyos', name: 'Fixyos', tile: [9, 1],
    doors: [
      [[0.705, 0.245], [0.745, 0.245], [0.745, 0.305], [0.725, 0.32], [0.705, 0.305]],
      [[0.78, 0.28], [0.88, 0.28], [0.88, 0.385], [0.83, 0.41], [0.78, 0.385]],
    ],
    outside: [0.77, 0.2],
    inside: {
      img: 'fixyos_inside',
      door: [[0.4, 0.5], [0.6, 0.5], [0.6, 0.78], [0.5, 0.82], [0.4, 0.78]],
      spawn: [0.47, 0.42],
    },
  },
  {
    id: 'hospital', name: 'Hospital', tile: [9, 3],
    doors: [[[0.455, 0.34], [0.535, 0.34], [0.535, 0.5], [0.495, 0.535], [0.455, 0.5]]],
    outside: [0.5, 0.24],
    inside: {
      img: 'hospital_inside',
      door: [[0.455, 0.29], [0.535, 0.29], [0.535, 0.44], [0.495, 0.48], [0.455, 0.44]],
      spawn: [0.5, 0.18],
    },
  },
  {
    // Babsha is an open market stall: the way in is the open shop front,
    // and the way out is back through it, over the counter.
    id: 'babsha', name: 'Babsha Childcare Supplies Shop', tile: [10, 1],
    doors: [[[0.3, 0.3], [0.42, 0.17], [0.49, 0.2], [0.46, 0.43], [0.3, 0.48]]],
    outside: [0.33, 0.18],
    inside: {
      img: 'babsha_inside',
      door: [[0.3, 0.45], [0.82, 0.45], [0.82, 0.78], [0.3, 0.78]],
      spawn: [0.5, 0.12],
    },
  },
  {
    id: 'bakabooms', name: 'Bakabooms', tile: [10, 2],
    doors: [[[0.505, 0.305], [0.575, 0.295], [0.575, 0.44], [0.545, 0.475], [0.51, 0.455]]],
    outside: [0.48, 0.24],
    inside: {
      img: 'bakabooms_inside',
      door: [[0.52, 0.36], [0.66, 0.36], [0.66, 0.56], [0.59, 0.61], [0.52, 0.57]],
      spawn: [0.55, 0.15],
    },
  },
];
