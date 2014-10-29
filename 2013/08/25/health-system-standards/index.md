# Health System Standards



So I got to talking to a guy at a <a href="http://www.meetup.com/DC-Tech-Meetup/">DC Tech Meetup</a>, and I came to learn considerably more than I had previously known about standards for health technology data systems.

Health Level Seven (<a href="http://www.hl7.org/">org</a>; <a href="http://en.wikipedia.org/wiki/Health_Level_7">wiki</a>;&#160;name from&#160;<a href="http://en.wikipedia.org/wiki/OSI_model">OSI</a>&#160;layer 7, the application layer)&#160;is the old guard in the field, it seems. They have standards for all sorts of medical information passing between systems, including something called a Clinical Document Architecture. Apparently version 2 is the most popular thing in the world, and the newer version 3 has not really taken off, perhaps as a result of bureaucracy and over-planning/feature creep. Which leads to:

<a href="http://hl7.org/implement/standards/fhir/">FHIR</a>&#160;(<a href="http://www.hl7standards.com/blog/2013/03/26/hl7-fhir/">intro</a>) (Fast Healthcare Interoperable Resource) seems to be the direction for the future, architected along the lines of <a href="http://en.wikipedia.org/wiki/Representational_state_transfer">REST</a>ful web services rather than older <a href="http://en.wikipedia.org/wiki/SOAP">SOAP</a> nonsense. Seems like an interesting origin story for this standard, which is now coming under the HL7 umbrella.

That's how I understand it, anyway - I'm just hearing about all these systems for the first time!

Tangentially, I learned that <a href="http://en.wikipedia.org/wiki/VistA">VistA</a> is written in <a href="http://en.wikipedia.org/wiki/MUMPS">M</a>! I guess they're sort of the original M users, but I hadn't heard about M at all since I heard long ago that <a href="http://www.epic.com/">Epic</a>, the <a href="http://en.wikipedia.org/wiki/Electronic_health_record">EMR</a> company from near my <a href="http://www.wisc.edu/">alma mater</a>, uses it. M is funny.

Update: There's also this <a href="http://openmhealth.org/">Open mHealth</a> project, which may be interesting.



*This post was originally hosted elsewhere.*
