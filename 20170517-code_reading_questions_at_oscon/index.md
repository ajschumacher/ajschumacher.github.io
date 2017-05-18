# Code Reading Questions at OSCON

[O'Reilly](https://www.oreilly.com/)'s 2017 [OSCON](https://conferences.oreilly.com/oscon/) had a "[code game](https://conferences.oreilly.com/oscon/oscon-tx/public/content/game)" with ten questions covering nine different languages. It was supposed to get people engaged in the expo hall, but the quiz-like gamification content reminded me of my old [code reading question](/20150616-code_reading_question/) idea. The questions are available in a [PDF](https://cdn.oreillystatic.com/en/assets/1/event/214/oscon2017_code_game.pdf) ([mirror](oscon2017_code_game.pdf)). I'll put the questions here as well.

---

### 1. Rust

```rust
use std::collections::HashSet;
use std::io::{BufRead, Result};

fn f<I: BufRead>(input: &mut I) -> Result<usize> {
    Ok(input.lines()
       .map(|r| r.expect(“ara ara”))
       .flat_map(|l| l.split_whitespace()
                     .map(str::to_owned)
                     .collect::<Vec<_>>())
       .collect::<HashSet<_>>()
       .len())
}
```

This function reads input. What else does it do?

 * A. Counts the number of white-space-separated “words”
 * B. Counts the number of distinct “words”
 * C. Finds the “word” that appears most frequently
 * D. Finds the longest line

<!-- Correct: B -->

---

### 2. JavaScript

```javascript
function search(values, target) {
  for(var i = 0; i < values.length; ++i){
    if (values[i] == target) { return i; }
  }
  return -1;
}
```

What does this function do?

 * A. Depth-first search
 * B. Binary search
 * C. Merge search
 * D. Linear search

<!-- Correct: D -->

---

### 3. Go

```go
func function(s []float64) float64 {
        var sum float64 = 0.0
        for _, n := range s {
                sum += n
        }
        return sum / float64(len(s))
}
```

What does this function do?

 * A. Sums the contents of a slice
 * B. Finds the maximum value in a slice
 * C. Averages the contents of a slice
 * D. Appends values to a slice

<!-- Correct: C -->

---

### 4. Perl 5

```perl
sub mystery {
    return @_ if @_ < 2;
    my $p = pop;
    mystery(grep $_ < $p, @_), $p,
    mystery(grep $_ >= $p, @_);
}
```

What does the mystery subroutine do?

 * A. Binary search
 * B. Merge sort
 * C. Removes items that are too large or too small
 * D. Quick sort

<!-- Correct: D -->

---

### 5. Java 8

```java
static void function(int[] ar)
 {
   Random rnd = ThreadLocalRandom.current();
   for (int i = ar.length - 1; i > 0; i--)
   {
     int index = rnd.nextInt(i + 1);
     int a = ar[index];
     ar[index] = ar[i];
     ar[i] = a;
   }
 }
```

What does this function do?

 * A. Merge sort
 * B. Shuffle
 * C. Increases size of array
 * D. Decreases size of array

<!-- Correct: B -->

---

### 6. Ruby

```ruby
def f(hash)
  prs = hash.inject({}) do |hsh, pr|
    k, v = yield pr
    hsh.merge(k => v)
  end
  Hash[prs]
end
```

What does this function do?

 * A. Reverses an array
 * B. Administers a booster shot
 * C. Enters a freeway safely
 * D. Transforms a hash

<!-- Correct: D -->

---

### 7. Python

```python
def function(list):
     return [x for x in list if x == x[::-1]]
```

What does this function do?

 * A. Finds and returns all palindromes within the given list
 * B. Reverses all strings in the given list
 * C. Swaps the first and last letter in each word in the given list
 * D. Returns a list of anagrams for each word in the given list

<!-- Correct: A -->

---

### 8. Scala

```scala
object Op {
  val r1: Regex = “””([^aeiouAEIOU\d\s]+)([^\d\s]*)$”””.r
  val r2: Regex = “””[aeiouAEIOU][^\d\s]*$”””.r
  val s1:String = “\u0061\u0079”
  val s2:String = “\u0077” + s1
  def apply(s: String): String = {
    s.toList match {
      case Nil => “”
      case _ => s match {
        case r1(c, r) => r ++ c ++ s1 case r2(_*) => s ++ s2
        case _ => throw new
RuntimeException(“Sorry”)
      }
    }
  }
}
```

What does this function do?

 * A. Converts a given String to a JavaScript-based String
 * B. Converts a Unix/MacOSX String format into a Windows String format
 * C. Converts a word into the children’s language equivalent called “Pig Latin”
 * D. Converts a given String to IPV6 format since IP numbers are running out

<!-- Correct: C -->

---

### 9. Swift

```swift
import Foundation

let i = “Hellø, Swift”

let t = i.precomposedStringWithCanonicalMapping

let c = t.utf8.map({UnicodeScalar($0+2)})
let j = i.utf8.map({UnicodeScalar($0+1)}).count / 2

var d = String(repeating: String(describing: c[j]), count: j)

d.append(Character(“🇦🇺🇺🇸”))

let result = “\(d): \(d.characters.count)”
```

What is the value of “result”?

 * A. ......🇦🇺🇺🇸: 7
 * B. ......🇦🇺🇺🇸: 8
 * C. “”””””🇦🇺🇺🇸: 7
 * D. “”””””🇦🇺🇺🇸: 8

<!-- Correct: A -->

---

### 10. JavaScript

```javascript
function thing (n) {
    for (var i = 0; i < n; i++) {
        setTimeout(function () {console.log(i);}, 0);
    }
}
```

What does this function do?

 * A. Prints numbers 0 through n
 * B. Prints n n time
 * C. Prints 0 n times
 * D. Prints nothing

<!-- Correct: B -->

----

View HTML source to see the answers.

I tried to keep the above close to what appeared on the physical
cards. I haven't tried to correct the little mistakes and bizarre
indentation throughout.

It's fun!
