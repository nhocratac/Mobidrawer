import React, { useMemo } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";

const Pageable = ({
  totalPages,
  page,
  setPage,
}: {
  totalPages: number;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
}) => {
  const pattern = useMemo(
    () => [-2, -1, 0, 1, 2].map((item) => page + item),
    [page]
  );

  console.log(pattern.map((i) => console.log(i)));
  return (
    <>
      <Pagination>
        <PaginationContent>
          {page !== 0 && (
            <PaginationItem>
              <PaginationPrevious
                className="text-xl cursor-pointer"
                onClick={() => setPage((prev) => prev - 1)}
              />
            </PaginationItem>
          )}

          {pattern[0] > 0 && pattern[0] != 0 && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}
          {pattern.map((item) => {
            if (item < 0 || item >= totalPages) return;

            return (
              <PaginationItem key={item}>
                <PaginationLink
                  className="text-2xl cursor-pointer"
                  isActive={item === page}
                  onClick={() => setPage(item)}
                >
                  {item}
                </PaginationLink>
              </PaginationItem>
            );
          })}
          {(pattern.at(-1) as number) < totalPages - 1 &&
            (pattern.at(-1) as number) != totalPages - 1 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

          {page !== totalPages - 1 && (
            <PaginationItem>
              <PaginationNext
                className="text-xl cursor-pointer"
                onClick={() => setPage((prev) => prev + 1)}
              />
            </PaginationItem>
          )}
        </PaginationContent>
      </Pagination>
      <div className="text-xl">Tổng số trang: {totalPages}</div>
    </>
  );
};

export default Pageable;
