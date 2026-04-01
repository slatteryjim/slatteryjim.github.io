import { Share2, MessageSquare, Bookmark, Clock, ChevronRight, Menu, Search } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-[#F9F9F8] text-slate-900 font-sans selection:bg-orange-200">
      {/* Navigation Bar */}
      <header className="border-b border-slate-300 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <Menu className="w-5 h-5 text-slate-700" />
            </button>
            <Search className="w-5 h-5 text-slate-700 hidden sm:block cursor-pointer" />
          </div>
          
          <div className="text-2xl md:text-3xl font-display font-black tracking-tight uppercase text-slate-900">
            The Daily Pixel
          </div>
          
          <div className="flex items-center gap-4">
            <button className="hidden sm:block text-sm font-semibold text-slate-600 hover:text-slate-900 uppercase tracking-wider">
              Subscribe
            </button>
            <button className="bg-slate-900 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-slate-800 transition-colors">
              Sign In
            </button>
          </div>
        </div>
        <nav className="hidden md:flex justify-center gap-8 py-3 border-t border-slate-100 text-xs font-semibold uppercase tracking-widest text-slate-500">
          <a href="#" className="hover:text-slate-900 transition-colors">Industry</a>
          <a href="#" className="hover:text-slate-900 transition-colors">Reviews</a>
          <a href="#" className="hover:text-slate-900 transition-colors">Retro</a>
          <a href="#" className="hover:text-slate-900 transition-colors">Esports</a>
          <a href="#" className="text-orange-600 hover:text-orange-700 transition-colors">Legal</a>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex flex-col lg:flex-row gap-12">
        
        {/* Left/Main Article Column */}
        <article className="flex-1 max-w-3xl">
          {/* Article Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-orange-600 font-bold text-xs uppercase tracking-widest mb-4">
              <span>Legal News</span>
              <ChevronRight className="w-3 h-3" />
              <span>Class Action</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-black leading-[1.1] mb-6 text-slate-900">
              Jury Awards $48M to Victims of 'Unreasonably Difficult' 1988 Nintendo Game
            </h1>
            
            <p className="text-xl md:text-2xl font-serif text-slate-600 italic mb-8 leading-snug">
              Players of 'Wizard Fortress II: The Staircase of No Mercy' may be entitled to compensation for decades of emotional distress.
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 border-y border-slate-300 gap-4">
              <div className="flex items-center gap-3">
                <img 
                  src="https://picsum.photos/seed/journalist/100/100" 
                  alt="Author" 
                  className="w-12 h-12 rounded-full object-cover grayscale"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <div className="font-bold text-sm">By Sarah Jenkins</div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <span>April 1, 2026</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 4 min read</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button className="p-2 border border-slate-300 rounded-full hover:bg-slate-100 transition-colors text-slate-600">
                  <Share2 className="w-4 h-4" />
                </button>
                <button className="p-2 border border-slate-300 rounded-full hover:bg-slate-100 transition-colors text-slate-600">
                  <Bookmark className="w-4 h-4" />
                </button>
                <button className="p-2 border border-slate-300 rounded-full hover:bg-slate-100 transition-colors text-slate-600">
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Hero Image */}
          <figure className="mb-10">
            <img 
              src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=2070" 
              alt="Retro gaming console and CRT television" 
              className="w-full aspect-[16/9] object-cover rounded-sm"
              referrerPolicy="no-referrer"
            />
            <figcaption className="text-xs text-slate-500 mt-3 font-medium text-right">
              The original 1988 hardware that delivered "decades of emotional distress." (Photo: Unsplash)
            </figcaption>
          </figure>

          {/* Article Body */}
          <div className="font-serif text-[1.1rem] text-slate-800 leading-relaxed space-y-5">
            <p className="first-letter:text-7xl first-letter:font-display first-letter:font-black first-letter:float-left first-letter:mr-3 first-letter:mt-[-8px] first-letter:text-slate-900">
              In a landmark ruling, a federal jury has found 1980s publisher Sunburst Cartridge Entertainment liable for “decades of emotional distress” caused by its notoriously punishing 1988 title, <em className="italic">Wizard Fortress II: The Staircase of No Mercy</em>.
            </p>

            <p>
              The $48 million verdict concludes a six-year class action lawsuit over a platforming experience so unforgiving that court documents noted “children were frequently sent outside to calm down.”
            </p>

            <h3 className="text-2xl font-sans font-bold pt-6 pb-2 text-slate-900">“If You Played This Game, You May Be Entitled to Compensation”</h3>

            <p>
              In the wake of the verdict, legal advertisements have begun flooding daytime television, retro gaming forums, and late-night cable. One widely circulated commercial opens with somber piano music and the words:
            </p>

            <blockquote className="border-l-4 border-orange-500 pl-6 py-4 bg-orange-50/50 italic text-xl text-slate-700 font-display">
              “Did you, or someone you love, play Wizard Fortress II between 1988 and 1994? Did repeated failures lead to distress, confusion, or screaming ‘THAT JUMP WAS IMPOSSIBLE’ at a household television set? You may be entitled to financial compensation.”
            </blockquote>

            <p>
              The law firm behind the ads says it has already received more than 200,000 inquiries from adults now in their 40s and 50s who claim the game left “unfinished emotional business.”
            </p>

            <p>
              “We’re hearing from people who still remember exactly where they died,” said lead attorney Martin Baxter during a press conference Tuesday. “One man broke down while describing the disappearing bridge section. Another told us he never trusted stairs again.”
            </p>

            <figure className="py-6">
              <div className="bg-slate-900 rounded-sm p-8 flex flex-col items-center justify-center min-h-[280px] relative overflow-hidden font-mono border border-slate-800 shadow-xl">
                <div className="absolute top-4 left-4 bg-orange-600 text-white text-[10px] font-bold px-2 py-1 uppercase tracking-widest font-sans">
                  Court Exhibit B
                </div>
                <div className="text-center space-y-6 w-full">
                  <div className="text-sm md:text-base text-green-500 flex justify-between w-full max-w-md mx-auto">
                    <span>SCORE: 014200</span>
                    <span>LIVES: 0</span>
                  </div>
                  <h4 className="text-2xl md:text-4xl font-bold text-white tracking-widest mt-4">WIZARD FORTRESS II</h4>
                  <p className="text-xs md:text-sm tracking-widest text-slate-400">STAGE 7 - THE STAIRCASE OF NO MERCY</p>
                  <div className="text-red-500 font-bold text-2xl md:text-3xl animate-pulse pt-4">
                    YOU DIED.
                  </div>
                </div>
              </div>
              <figcaption className="text-xs text-slate-500 mt-4 font-medium text-center font-sans uppercase tracking-widest">
                Court Exhibit B: A recreation of the screen plaintiffs claim caused "lasting psychological damage."
              </figcaption>
            </figure>

            <h3 className="text-2xl font-sans font-bold pt-6 pb-2 text-slate-900">“Just Vibes and Suffering”</h3>

            <p>
              Members of the plaintiff class testified to far-reaching consequences. “I was nine years old when an invisible enemy knocked me into lava,” said one 47-year-old claimant from Ohio. “I still save my game before opening doors in real life.”
            </p>

            <p>
              Another plaintiff testified he spent an entire summer using the wrong sub-weapon because the game offered “no tutorial, no mercy, just vibes and suffering.”
            </p>

            <p>
              Court filings included expert testimony from retro historians, child psychologists, and one speedrunner who described the title as “technically beatable, the way opening a pickle jar with oven mitts is technically possible.”
            </p>

            <h3 className="text-2xl font-sans font-bold pt-6 pb-2 text-slate-900">Audible Gasps from the Courtroom</h3>

            <p>
              Sunburst denied intentionally making the game impossible, citing “the standards of the era” and a belief that “memorization builds character.”
            </p>

            <p>
              However, that defense crumbled when plaintiffs unsealed a 1987 internal producer memo:
            </p>

            <blockquote className="border-l-4 border-slate-900 pl-6 py-4 font-display font-bold text-2xl text-slate-900 bg-slate-100">
              “Make Level 6 harder. If children can beat it during the rental period, we lose cartridge sales.”
            </blockquote>

            <p>
              That document reportedly drew audible gasps from the courtroom.
            </p>

            <div className="bg-slate-100 p-8 rounded-sm my-8 border-t-4 border-slate-900">
              <h4 className="font-sans font-bold text-lg uppercase tracking-wider mb-4 text-slate-900">Settlement Benefits</h4>
              <p className="font-sans text-sm text-slate-600 mb-4">According to the settlement website, eligible class members may qualify for:</p>
              <ul className="font-sans text-sm space-y-3 list-disc pl-5 marker:text-orange-600">
                <li>Inflation-adjusted refunds for the original $49.99 MSRP.</li>
                <li>Standardized payouts for <strong className="font-bold">“documented controller-throwing incidents.”</strong></li>
                <li>Up to $3,500 in damages for players who reached the final boss but perished.</li>
                <li>A $500 supplemental award for anyone who wrote to a game magazine asking for help and was ignored.</li>
              </ul>
            </div>

            <p>
              For many former players, the case represents more than a financial payout. It is, they say, long-overdue validation.
            </p>

            <p>
              “I was 10,” said one plaintiff. “Looking back, I now understand that no child should have been expected to deal with that much lava.”
            </p>

            <p>
              At press time, the settlement website had crashed, reportedly after claimants were asked to click a button labeled ‘Continue’ and instinctively assumed it was a trap.
            </p>
          </div>
          
          {/* Article Footer Tags */}
          <div className="mt-12 pt-6 border-t border-slate-200 flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-slate-200 cursor-pointer transition-colors">Retro Gaming</span>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-slate-200 cursor-pointer transition-colors">Lawsuits</span>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-slate-200 cursor-pointer transition-colors">Nostalgia</span>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-slate-200 cursor-pointer transition-colors">Satire</span>
          </div>
        </article>

        {/* Right Sidebar */}
        <aside className="w-full lg:w-80 shrink-0 space-y-10">
          {/* Ad Placeholder */}
          <div className="w-full aspect-square bg-slate-200 flex flex-col items-center justify-center text-slate-400 border border-slate-300 p-6 text-center">
            <span className="text-xs font-bold uppercase tracking-widest mb-2">Advertisement</span>
            <span className="font-serif italic">"Have you been injured by a water level?"</span>
            <span className="text-sm font-bold mt-2">Call 1-800-BAD-JUMP</span>
          </div>

          {/* Trending Section */}
          <div>
            <h3 className="font-display font-black text-2xl border-b-2 border-slate-900 pb-2 mb-6 text-slate-900">
              Trending Now
            </h3>
            <div className="space-y-6">
              <a href="#" className="group block">
                <div className="text-orange-600 font-bold text-xs uppercase tracking-widest mb-1">Hardware</div>
                <h4 className="font-sans font-bold text-lg leading-tight group-hover:text-orange-600 transition-colors text-slate-900">
                  Man Discovers Working Save Battery in 1994 RPG, Weeps Openly
                </h4>
              </a>
              <a href="#" className="group block">
                <div className="text-orange-600 font-bold text-xs uppercase tracking-widest mb-1">Opinion</div>
                <h4 className="font-sans font-bold text-lg leading-tight group-hover:text-orange-600 transition-colors text-slate-900">
                  Top 10 Water Levels That Constitute a War Crime Under the Geneva Convention
                </h4>
              </a>
              <a href="#" className="group block">
                <div className="text-orange-600 font-bold text-xs uppercase tracking-widest mb-1">Science</div>
                <h4 className="font-sans font-bold text-lg leading-tight group-hover:text-orange-600 transition-colors text-slate-900">
                  Is Blowing in the Cartridge Actually Bad? A 30-Year Debate Finally Settled
                </h4>
              </a>
              <a href="#" className="group block">
                <div className="text-orange-600 font-bold text-xs uppercase tracking-widest mb-1">Culture</div>
                <h4 className="font-sans font-bold text-lg leading-tight group-hover:text-orange-600 transition-colors text-slate-900">
                  I Forced My Kids to Play the Games I Grew Up With and Now They Won't Speak to Me
                </h4>
              </a>
            </div>
          </div>

          {/* Newsletter */}
          <div className="bg-slate-900 text-white p-6 rounded-sm">
            <h3 className="font-display font-bold text-xl mb-2">The Daily Save State</h3>
            <p className="text-slate-400 text-sm mb-4 font-serif">Get the best retro gaming news and legal updates delivered to your inbox.</p>
            <input 
              type="email" 
              placeholder="Your email address" 
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-sm mb-3 text-sm focus:outline-none focus:border-orange-500 text-white"
            />
            <button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 rounded-sm text-sm transition-colors uppercase tracking-wider">
              Subscribe
            </button>
          </div>
        </aside>

      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 mt-12 border-t-4 border-orange-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-2xl font-display font-black tracking-tight uppercase text-white">
            The Daily Pixel
          </div>
          <div className="flex gap-6 text-sm font-semibold uppercase tracking-wider">
            <a href="#" className="hover:text-white transition-colors">About</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
          <div className="text-sm">
            © 2026 The Daily Pixel. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
