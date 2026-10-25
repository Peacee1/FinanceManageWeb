"""A configured dispatch cycle, advanced only after a confirmed march."""

ORDER = ('wood', 'stone', 'food', 'gold')


class FarmCycle:
    def __init__(self, allocations, cursor=0):
        if set(allocations) != set(ORDER):
            raise ValueError('Cần số lượng cho cả bốn loại tài nguyên.')
        if any(type(value) is not int or not 0 <= value <= 7 for value in allocations.values()):
            raise ValueError('Số đạo quân mỗi tài nguyên phải từ 0 đến 7.')
        self.plan = [resource for resource in ORDER for _ in range(allocations[resource])]
        if not 1 <= len(self.plan) <= 7:
            raise ValueError('Tổng số đạo quân phải từ 1 đến 7.')
        self.cursor = int(cursor) % len(self.plan)

    @property
    def current(self):
        return self.plan[self.cursor]

    def confirm_dispatch(self):
        self.cursor = (self.cursor + 1) % len(self.plan)
