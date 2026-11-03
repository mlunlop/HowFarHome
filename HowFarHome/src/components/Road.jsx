// Carretera en perspectiva con la línea central avanzando. La usan la portada y la carga.
function Road({ className = '', slow = false }) {
  return (
    <div aria-hidden="true" className={`relative overflow-hidden mask-t-from-50% [perspective:280px] ${className}`}>
      <div className="absolute inset-x-0 -top-[60%] -bottom-[40%] origin-bottom [transform:rotateX(64deg)]">
        <div className="absolute inset-y-0 left-1/2 w-[min(70vw,560px)] -translate-x-1/2 border-x-2 border-white/35">
          <div
            className={`road-dashes absolute -top-[140px] -bottom-[140px] left-1/2 w-2 -translate-x-1/2 animate-road ${
              slow ? '[animation-duration:2.8s]' : ''
            }`}
          />
        </div>
      </div>
    </div>
  )
}

export default Road
