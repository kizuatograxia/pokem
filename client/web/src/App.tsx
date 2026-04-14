
import { PokemonSprite } from './components/PokemonSprite';

function App() {
  return (
    <div className="antialiased font-sans text-gray-900 bg-black min-h-screen flex flex-col items-center">
      <div className="flex gap-32 py-10 px-20 z-50 relative bg-gray-800 rounded-xl border border-gray-700 shadow-2xl mt-40">
         <PokemonSprite dexId={3} facing="front" scale={3} />
         <PokemonSprite dexId={6} facing="front" scale={3} />
         <PokemonSprite dexId={25} facing="front" scale={3} />
      </div>
    </div>
  );
}

export default App;
