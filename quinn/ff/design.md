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
game is open. The music is in `Footsteps_On_The_Square.mp3`. Web
browsers do not allow sound to play until the player interacts with
the page, so the music starts the moment the player clicks the "start"
button on the initial screen. From then on it keeps playing forever
without interruption, and it stops when the player closes the game.


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

When the player clicks on the "next" button, they go to the fairy
chooser screen.


### Fairy chooser

The fairy chooser screen comes between the welcome screen and the
fairy world. At the top it says "Choose your fairy". Below that is a
grid of every possible fairy emoji: rows run top to bottom as female,
neutral, male; columns run left to right by skin tone, yellow first
and then light to dark.

The fairy is a fairy emoji for the time being: a gender presentation
(neutral, female, or male) and one of six skin tones.

So that players are not visually confused, a fairy emoji already in
use by a player currently in the world does not appear in the grid —
there is a blank in its place. The "next" button (the same one used on
the welcome screen) starts inactive. When the player taps a fairy it
becomes highlighted and the "next" button becomes active; clicking it
enters the fairy world as the chosen fairy.

To keep things simple, the grid only reflects who is in the world
while the player has not yet picked. Once a fairy is picked there is
no further clash check, so if players join or change while someone is
still on the chooser screen, it is possible (though unlikely) for two
identical fairies to end up in the world at once.


### Fairy world

The fairy world is an explorable universe that the player flies/walks
their fairy around.

The fairy is the emoji the player picked on the fairy chooser screen.

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


### Screen flow

The game flows forward through its four screens — initial, welcome,
fairy chooser, fairy world — and the player always enters by clicking
through from the start. There is no URL routing: the address never
changes, and refreshing the page returns the player to the initial
screen.


### Multiplayer

Fairy Fun supports calm, peaceful multiplayer: players can wander the
same world and see each other's fairies.

There is no game server. Players connect directly to each other
peer-to-peer (over WebRTC) using the Trystero library. A Firebase
Realtime Database carries only the brief initial connection handshake;
once players are connected they talk straight to each other. The game
itself remains a set of static files — Firebase is a hosted service,
not a server we run.

For now, everyone who plays Fairy Fun shares a single world room, so
any two players who are in the fairy world at the same time can see
each other.

A player only sees another player's fairy when both fairies are
standing on the same tile — wandering the world and bumping into a
friend's fairy is the multiplayer moment.

Players keep their fairies visually distinct by choosing from a grid
that hides fairies already in use (see the fairy chooser, above).

Each player quietly re-broadcasts its presence every few seconds.
Peer-to-peer disconnections are not always cleanly signalled, so any
fairy that has gone silent for several seconds is treated as gone and
removed — this prevents abandoned "ghost" fairies from lingering.

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
