const pageTitle = "Параметри"
const pageDescription = "Кольори, розміри, категорії та підкатегорії основ і принтів"

export function ParametersHeader() {
  return (
    <div className="mb-8" suppressHydrationWarning>
      <h1 className="text-2xl font-semibold text-foreground" suppressHydrationWarning>
        {pageTitle}
      </h1>
      <p className="text-muted-foreground" suppressHydrationWarning>
        {pageDescription}
      </p>
    </div>
  )
}
