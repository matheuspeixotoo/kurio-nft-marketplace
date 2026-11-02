import { Link } from '@tanstack/react-router'
import { Fragment } from 'react'

export function Breadcrumb({ items }: { items: { label: string; to?: '/' | '/cart' | '/checkout' }[] }) {
  return (
    <nav aria-label="Trilha de navegação" className="text-[15px] font-bold text-foreground">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => (
          <Fragment key={item.label}>
            {i > 0 && (
              <li aria-hidden="true" className="text-foreground">
                /
              </li>
            )}
            <li>
              {item.to && i < items.length - 1 ? (
                <Link to={item.to} className="hover:text-primary-light">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={i === items.length - 1 ? 'page' : undefined}>{item.label}</span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  )
}
