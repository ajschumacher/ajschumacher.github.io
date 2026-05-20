# Fairy Fun game design


## Synopsis

Fairy Fun is a web game designed by Quinn, age seven. It is not a
fighting game, but a whimsical gleeful game of exploration and fun.


## Platforms

Fairy Fun is playable on laptop and desktop computers and also iPads
and phones of all types.


## Design aesthetic

Bright rainbow mostly.


## Gameplay


### Background music

The game has background music that plays on a loop the whole time the
game is open. The music is in `Footsteps_On_The_Square.mp3`. The music
should start the moment you enter the game and keep playing forever
without interruption, but should stop the moment you exit the game.


### Initial screen

When a player first goes to the game, they see the Fairy Fun logo at
the top of the screen, centered. This is `images/fairyfun.png`. Below
that is the "start" button, `images/start.png`. Below that is the text
"Idea by Quinn. Made by Quinn and Aaron. Version 2."

When the player clicks on the "start" button, it brings them to the
welcome screen.


### Welcome screen

The welcome screen has this informative text about the game:

"""
Welcome to FAIRY FUN!

This is not a fighting or competing game.

This game is supposed to be calm, peaceful, and fun.

There should be no cheating and just be yourself.
"""

Below this text, there is the "next" button, `images/next.png`.

When the player clicks on the "next" button, they enter the fairy
world at tile (7, 2).


### Fairy world

The fairy world is an explorable universe that the player flies/walks
their fairy around.

The fairy is represented by a fairy emoji for the time being. When a
player first loads the game, their fairy's appearance is randomly
chosen: a gender presentation (neutral, female, or male) and one of
six skin tones. This keeps players visually distinct in multiplayer.
The choice is preserved in the URL (and the browser's local storage)
so it survives a refresh.

The player controls the fairy's movement with arrow keys when a
keyboard is available, or with an on-screen "joystick" for screen-only
interfaces - a circle within a circle that the user can push with
their finger in the direction they want to move.

The fairy world has 30 "tile" images that are referenced by their
position relative to the (1, 1) tile in the lower left. The world is
ten tiles wide (left to right) and three tiles "tall" (up and down).
The seventh tile to the right and the second tile up, tile (7, 2) is
the starting tile.

When the player moves beyond a boundary that leads to another tile,
the tile image changes to the new tile and the player appears in the
side closest to the tile they were last on. In this way the player can
explore the whole map.

The tile images have filenames like `images/world/7_2.png` which is
the starting tile.


### Sketch mode (easter egg)

Quinn's original hand-drawn sketches of the tiles live in
`images/qworld/`, with filenames that mirror `images/world/` but use
the `.jpeg` extension (e.g. `images/qworld/7_2.jpeg`).

The fancy `/world/` images are the default. The player can secretly
toggle to the sketch versions by triple-tapping (or triple-clicking)
the fairy. Triple-tapping again switches back. There is no visible UI
for this — it is an easter egg.


### Screen persistence via URL

Each screen has its own URL hash so refreshing the page keeps the
player on the same screen:

 * `#/` — initial screen
 * `#/welcome` — welcome screen
 * `#/world?tile=X,Y&pos=PX,PY` — fairy world at tile (X, Y) with the
   fairy at normalized position (PX, PY) within the tile. If sketch
   mode is active, `&set=qworld` is appended. The world URL also
   carries `&fairy=...` (the fairy's appearance). Every screen's URL
   carries `&fairy=...`.

The fairy world URL is kept in sync while the player explores, so a
refresh lands them on the same tile in roughly the same spot.

Browsers block audio from auto-playing until the player interacts with
the page. If the page is reloaded directly into the welcome or fairy
world screen, the music starts on the next click, tap, or key press.


### Multiplayer

Fairy Fun supports calm, peaceful multiplayer: players can wander the
same world and see each other's fairies.

There is no game server. Players are connected directly to each other
peer-to-peer (over WebRTC) using the Trystero library, which handles
the connection handshake over free public infrastructure. The game
itself remains a set of static files.

For now, everyone who plays Fairy Fun shares a single world room, so
any two players who are in the fairy world at the same time can see
each other.

A player only sees another player's fairy when both fairies are
standing on the same tile — wandering the world and bumping into a
friend's fairy is the multiplayer moment.

If two players happen to have the same randomly chosen appearance, one
of them automatically re-rolls to a different look so they stay
visually distinct.

If the peer-to-peer connection cannot be established (no network, or a
restrictive home network), the game quietly falls back to single
player.


## Future plans (not implemented yet)

 * Fairy creation between welcome screen and pick your pet.
 * "Pick your pet" screen between fairy creation and fairy world.
 * Upgrade fairy emoji to customizable fairy images.
 * Make fairy world 3D.
     * Edit some of the images so that we can make it 3D so that we
       can see some signs that may be blocked by other things.
 * Side doors that lead to fun activities including obstacle courses
   and much more.
 * Pick a car or other vehicle.
 * Add up/down buttons to switch between walking and flying. When you
   press up, up turns grey and down turns rainbow. When you press
   down, down turns grey and up turns rainbow.
 * "Exit" button from all screens except initial.
