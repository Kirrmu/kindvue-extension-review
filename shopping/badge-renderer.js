(function install(scope) {
  "use strict";
  const MARKER = "data-pawmark-shopping-mode";
  
  const MARK = `<svg aria-hidden="true" focusable="false" viewBox="0 0 48 48" fill="none" data-kindvue-logo="transparent"><image href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAACXBIWXMAAAsSAAALEgHS3X78AAAgAElEQVR4nO19CZgkWVVu9wwMIPBUnoCKAiIujOI2oijoiNuDJ7iALTwVFZURVFAZN1SspyiCwygN80aHGZihh+kZc3qZ3mrLzNgj11hyqa27et9rXzIzIjIzIu77/nvjZkUt2V3V3TPTNdb9vviqujoyMiLuueee85//nLNt29bYGs/mIIRs35qB/+aTTwi5BcezfT9b41mY/J29O1/Af0+QxK3btm3b0gjP9RFN9DbhbOpus567nJ9V9j6qPfRd+Bsh5NYe0rOlDZ6rI5Fgk586k/q5ipcJh4kSjpAssRrqojYp/hk0ADTC1pbw3BxUvb/97R95QalWKI2QDCm4/a28k/JLbTk4SkyiTaX7UmdTr+La4Nm+4a1xAwefUOVC+iNHiUVMJ902XZGYrkwMRwgMJ9UeJxaxXe3MwbF9b8W5IhGftzUJz4HBDb3HKo99vVVXzlZDkVhOOrBdmdhOmtiOSCxXJsVGul0NNFJxdUc62//r+MyWEDyHDD/5Yt+HjpEsMdy0b7gSsVyBWC4mXyS2KxHbk4jpCH61rQbD7UKQOjvwR/HPb41NPuy6nhklKjFcyTddhdgem/yVh+kIQbmp+sdImeRn9U/gs1tu4iYd3KIXzw2+2Wqooe2mIQCh5SiEbgErhABaAH83nXRY9lLtE6REpAupv4qutaUJNtvgk5adSf7DCWIT0xXaVjTJTACk1YcrE8tNE9PpD0ue4I8Si6TPJOEmbtkEm3UYi6ncKMmRoiMFpieSkiuQUrTvrzysyD6wPYEYDSEseUow1MqT9JnBHbjWlibYJIOjevvMfW+wGpJXakG1S6HlYfJh+InE8qTActO+5aWjbUHsGIdUEzjUMAzKLYVUvZwjnBy8E9fcMgw3wRBF5scbs9qHjxETk+ov7fdslVdbmfAoMYjdTPkmtRGw8tMxbcDsAnx2mGSJXdfPPmInKFjU07MFG9/Ug6vqzJT0xePEwoS3+YRiVR8lOVJxskltMnMfQKByU/YNJx1anrh6W/AkUnTT7WPEIKV6/qno+lvBo5t58AnKzgjKGMkTy1nSAPD3j5ECyU0Jd+Ec8Xzf340GeVJuaoHpikHcHmC/y8TwgBwm2+PEIJlJ6W/Yd2xhBDf15B8cE7/BbMiXqr5CzIYQRgIQQv2XXJUY0+qb+WfSpwY/UHWL2O9xHhWCjmsYHYYjhHYTn9Wc/ZXEHdF3bUUQb7bBJ8WazX2/6Yih5aWhAbgABIB8i3V5MmElXs7ON56Pn+L53vdVm3q7EhMC5hpKpOTAKFRI0Un6oyRDSo2ctG3btq3JvxkHt9K1KeltwyQDYCfg6hxbAfZ/fXpAjWmL7SQK/ojnB9431Mz5dlMIi44cWq5C3UauEaA9DCflwx4wF1W6hWxtBTcrADQtvRsTZblCZ/+3Xak9TookN598OH5u9DsVAm1S/OAoPteUfKh9Ch51BECk+EA1UEnJ0S8+Xnj8W6PPbhmFN8vgk9o3fuT3YbTZ1AWUYgJgkvyC+M/xc/ngEUBtUuk5TgrEcAei2MGSALDfhTbQxcy0eO9a13m2B2HkllvxPHCJ4wc05HNaYDkGcHD0qY9ism1ParP9XADA0x4nNjk0nrg7fm5sdFhB+bnUruPEJKajtFcjhmJYakEY9Nrg8cHvuFmwAUIIJndd9wFB4Eyp56YAjDz1sSUBECMBkHwIQOpC7+91W7l8dfQkel5SquULcBkBBrHJX/IMDFf0ATLlZ6X/fLYRwsSKVZ3IP/yNRl3/hb6Thz96+Ni+v09fOPJ/D4w/8XHpUv/vGgu5N9+XuO8l/NznHBVuSQD2fewYKWLiOwJgUQzAJpnZ9K9fSXXzldE3fvCHyq62UGkDSoYngWARCySZsA+aMql4eqP/1MHvxvnPNLG0h/R0qO0f2fmRFyRPH3lPblbck19Mz4wEBTJOrPAoKRAcY2GWHCV5UmrpQWFROp2bFv9f8tTBH3vOCcHSFrD3o8dInthess0igAzWPUYskp9Xrxrc4ddRzg1+EC/QcmTfcBUCz4C6hl6KmA1oFJMUF4V7nmktQFheA1310pn0jsy0UB4Os2SUZMJSmz0rbBWqASkSKtCfCHcPBQqBZis3tVCbFg4mComIHZ24dRvZ5BR5PnH940c+iIc0nUEfgR2L0r8EHyTQzIz0a+sx3vgLNhf1I8eJTQw35Ue2BDscJcDLNOvS+Qf7Ey+Lf+bpHCS678PDe16TnRncP+bn6cSbTiqwPbkNbbUWmBUZsCF1jZ1023ZAis0Ts67NK+f1D0TX3tyagL8c9ZL0a8wNTEUCIEVbgEnES/0fWI8AcJWePK98Z9nJTVd8CNFgyCZfo9rAcJMUWi7Oq3/QxbC8wc+XoPcsnu9/p1VXJ8Yh5F7Sp8/psmDWWhO/wojlgbHQcAb8kg9BqBD5YvLT0XvBc29OTcDVcG5a+/lRasClfc4CsqKgzsGxxMfWO1ncNTQWcn8BdW+5SR+hY9tRCIJHzBgsEKMm9j7dK4hEAqtNiB8ZaunhkC+Hhqu0DU8JTQp2MS5D3FhdTXrhpBh2Pg12OUJgNZMtuL7qRDJykTeph8ANuMJ84U0lT2f4f0NhGoAKQJFoE6l/3MBqZV7Bwz0vtBuZMk0oocxiRApTxHC10GoqYBm37Jn89zxdQkA6Kz/9iWOkRMpNxWcqH/chg+7GDk+mk9pdADD5nBaXjmwjwNxCaHrJ9ggpEvlC6vfj37mpBlfb6Yv6a8yGslhuIxgkhpENQJHAwoL0xY0AOFyriGcH/w84BIYrBuwlp6lXAGPwBIzLWelvN3Ld9Q7+/dKFwb/BFgZ3Fs8EniNb8WliUiobvBOVGI5O8x64Nii5cgfSXn5AUzBmNH0ORwoqbZUMtbJzfeMHImF+9vGNjQ6+d92anRdKoIOBA8BCwYgF5EluNpW8xpW63a7rCrYW0xWYQQhyqSP7+FuhJmZu9MOQSJjSZ/s/MBLmidVM+UUYeVjFdMLxOyx9au37lpNqGw2wn5iAYqV3F4A17ANqJxWJXc9u3oAXn9jMTHoPQ/MEn+19UjBENGLV1bNPadpLo3O3b2QVZield4yQHLE8bAORte1Ioe0pxKirzdSx1O03auUkou1sT/WJt9iO2Cy1BkPDTQZ0dcMGcUS/1BSDcVIi46RKoL7HSZ6UW8AssD1gdav0XHudAsC2CWhKi2Sn9Y9uyq2AG265WfXTJ0mJPtAShCsTs6a0dud3f881gjfbzbqShWaBKuaGleXKbWAMmSn5QzdiGyCRYD6Y2v1Kqy6PI68Bq9OAJvMEgv1/NNDJUEttFebVQ/mF/O8UZrO/mJ1X/nWoacyO+nmq+WxPZXu+t34BYGFzlVTc7LkD2QOvjN/Pphid1TqhvnuMooFSUPI6YFAwhnDubOFdG5XuTqRxQvkAJnsJIqYHZQwVZsX/is69Lg1Aos8b89pXjuN+G8m27ajE9GCwDdCtzFzUx1JnDv1EdP52Ho8YPCW9waplx8FdWDIUlzyDUlO+qrtoulIbdo21oH0y/uybYvAXccg+9CqrIc9XwAqK1DX2ypPEJoVp+TMbfbBOUQkj+bWlRubUUJiBLx0xiKRgOMT2Ip39dOLTXxs//1oFOD+pvHPEzxDTSwUUenaAO4j+GMli8u1H5Ue/iZ8PrYdnMSKCy/7R/W+0XWWiGlJtEUJw1r0FUAaUFJbbIMNoC/3j/a+Pv9dNMfjLz8+n0iCBGB7UJ4wmyT9KMiQzm8xd43XZ5MxpnwM6WHRTPvINTFcJrQZgVo3ol+SfvlZomPBg1MMPv9B2ckWksxfdwcB0BVJsyMEQtp6GemJ/xEVYK4mVC0FmMrNjFJrCw+c3JgB29K4QO8nNyzuv9XmetcFfjDo58ImTxAKM22YCIIalpkCshub1j/VvOIjDVbM2Jf6w7eoB9mPDg9EFq1xoQ13zlLJryTAmHUaz9iH4+0hoNSMIF5zEcjPrJc/0vvVqOAbf2owF7XHck+Gk48SYqwoAkmdMVwpLbZ2YDX3hMfWx120qLcAnKn26/8ethkaQFMK3AbhwR4lN5Evi70Tn3npN2mVWSh8lRWJ4SDChyFob/87Pqbuu57r3DOx6sVXXRqtEASU9MCOLH0hdYV76+/UIF5+ox7OPv9asa5OVQCJmI825kevxBCg2YERawFos3rfZtEAHDzAW9DLFA1xYxRAA0R8FNWxOPngtBht/+dZi4W+QRAqEkVvPQyRLCgvycE9PD5ugDUTXCI9jTEi/hQik4Q7ybSuAKrcbevmBgw98TXTu9vXep3JZ+Htq0MEdXkZ5v9LBgl7wnMowGp2Md+TEkTfiepumnhJXg7lZ5V9goSMugIcrumJo+gqxGvrcA8kHXr1Rg62TeXxq4AeshtIuNQG4CCE0jNGWiNFQ3b7Rvu/a+PayjUUf67o4SjSsfh/IHnx6RDHzc/lfib5/XauQn/dg/4MvM6nRSqHxJcZz1wOpc1HUk+IcKX8MAlnXH4s//00/+MuXzibfaDt622qm6F5qIS+AsoNMok8rH70Gdc2F5XnFBXkE7hZerOlJYcFJh1U/S3IT8s9vRGUmItBHPJN8a7mdJYYH0EcIDVf1R2H113VtvRG6OFeAk13V6dQfM1BM9gEkgS5Pg1prZEpb3G3kAoB35gFx1MJBniO5Wehk/EUU5tQ+hE4tGEMOwBHJHyMZYtQygG837K7xiTXm1P+g6tWT2jDWTE+gEUf5UuqPNmIIEm78Tav3HuNGKwxM4PMkS/Qp8f3svO4vnmwj2/l97dix49b0yYGf7D3W+z/w77t33f1iu65VgYsYrhCwFR5FB5eBQN14BIDRC8Sus5yITQMM8ReiT8q/MBzS8HBgOZTQEVruYDAc5kluUv+F+LnrGXwiMpPSrwE2tTyRWuuGBxjVIFYtF1HPr35NEr3Mu3fd8+LiojpeCTOw/gMc9Pe6dpLz+Pg2sdY1+P3vHdn7Q/pMSoIXoU6mKfkFIzutvYdqE68/gBZkUcHlk72qaMayOAG0ZokU55RNWTPhFquWKUa5gmDOEMMDmSNPigtaGidsRKrjVrZRUxbKvowaBCGAGqB02RlJXu81E5E61Sfln6y0dFJ00iECPgUn6R+n5Wqy/3YlYYo4ffieW/Sp9F9XmllvmOhhlQD108ceFvd/HT+3VBeF48h2djSfCYCw9uSvYSjChQY/stSUpwaPH/qOTWMPdJC12cxvwKVBrgB9IE8MgbINBwWSuaz+yrW6OflZwQBgY7jgDUrBMNEpTAswZz1CQCL1n5uV/uU4KdJSdshMKtK0NoWIp8Q3d3vZXBATQ+JLcvPyPvj8lZbkYysquoMUzjXn9b/j5yfPHP7ZkqsxDYggVmylr8dFNBpYNEVi1vSB2FZw028H7AZ37LjVrmULQAZtDwCLSoqOGFDSZ13P3XHHHRRB24ixhZ/ZmXSCahJHoqHasi8Ru5GZHjiuvyI6b13Xy86JhVFCLXW/4AD100l+IV2GK7vWffHrwjU0F/Xe06SKsG/Lxh4Pkocrh3Yb3o42s6eyhwI5GIUF9YsnECNxU20aI4kJwJVBIhiO4B0obWwF4qW+f4ju4+bfCvjKTp/s2zEWFumeTY2spkIMR6ZbQX5O6JYwcuWVO639DbWwXaltYGU1ae3BcO/IE997NVeQRJP4lDn4zUZDnyv5YBmJoUGzmAqoVvYQO2+FZoItgKOn5xbbEQ6cBE7gSC3bRWg6Ra14GjhywVUoEr3G0uEwDp5IvrraKlyq+uqSW8iJrt3qJ0XwMDSG4aVD05OCcjtP8jOMYb0p7AEeo7dq2j62Ygcpjl9syCFKwVS83ET2Uva16/XfuVAdGDnwzqEAQRshgADg5YB3kDx95J3x8650DW1K+6URQLbeQGB4EmyAAJVJpIvpd691jY72mVI+dYqyhJItGvunLpyA7Y2YXpoiiSVfI2W34Dye3/ed/PPq5dQfUOMVxBZ3BZewmxaIvAZcH55Eua2TipubHTxz5IefCULsdQ8+qYdG9n5vxcksllpCJM0qMRsyxQXMBW3/eo0bLlBHRve/0aiJodUESRREzYh5NKf+bnSt7q4bYf8nXUh98jgpgeGLmEVotWRSqAleb7X32+P3vowidnHw3cNBFqoc+Y/w0yMQB/YNInoDQbUtk0or3xQupXg21HZ+38UF9QloLstNtSlBNFYjaW0BiJNJsRWkgyFfJ1UvOyFyIbjZNQFXperF5Cdo+ZhmivrvWD2IEYBzp0/I6/LhO+p79KlvLi6mF0o+yJkAb3CdPBk4fegv1yEAt+Cn2dB7YVyxqKUcVIhKinXx5AMHDy6Dfjsh6UziZSUne2KYIEScYinwHLhhBS2CIT9DSm62cfjoXurm8onn10DY2lrUy5Q+30i3QSunVdIYBLzKIKQYAbcZoppKhpMMhkKU2S3M7BtitZZvds+AGVJ3bnueVdMVrFRE3PDQhiOHWEFDXtY5UD3wlqup785kDCVeUnKkU1D7hgdEMN0GNWvg9OE1s5Bjg37+9a9//QsKi8JRGIDwIooOYhU5kplLHlj5Qvm19Anxn0BwLboCjXLCnqHoHtxbB4yeDCZlvm+876fWEmZ+zX3Vx99gO5mLEYU+SqNb2yPgmoVqAQchcNgDAt1mKoFG7IbmypeS7115zzdvpPBk//eX3cxiBalUtJqITIpuMqBVQOq58b6Rvm9arz2QW0jnwRU0PAnGJU1DLzkGTRwlZOi2KHP31vhhGCxuv1t76psLC8JMNYBBiv0/2YZnkjzXu4y0wl2+PcOHX2M11OmSjz0e2INM93urmcTkh2BClxy9ceTEkZ+7kibjwr278JUfLNX1U3BBLTfVskA+odtBvKYytAITAm4sUiYx/X9ovkG/QgRS8vSZL0dchZs6dNyhd01KHwVDCClVrH4g5dhTONeq5Q/DBYsBLWtdh6WTz0uHaUFKT/KL1AawiFnLPnklLdITCdZXso+/wWooTfAUig0phP8ONDE3p/5pfAKX7ln5V+zdRnOwzYw9hfIEi95gaDbFoNrMhqlzvb8a/2y3we/t8NE9r7NqmgnuRMmTfcuR28AJIjp9RIFHgi2roRihqfRnydEoLb3g9fuWp4YVp/JjmyJ03Jm8GfEhCIHlSG0aKALD101TEMWoKV/i564lBB2QaV56FPu+0UBlkXRA1XlNLOwffeJdxTn9n+1G7kF9WnpCmxT3ZWbkJ3NzyiNmPfO57LT+gadGE39CLWsvTQoAgBzQvpC/oL+fW9dL+/YDX1tpZE5VQwS0BFQ2IyZFNbEfD/pgKSkT0l9uxCDjz3Bv4t4XKRPJzw43cwGynWxPpDmEpidTfMOgal/oHBAIylRylLDgiC07UEilZUzz5hs3tQbA4C/1N++5+8V2Tc8BHAGvnmfagOABQzE7pX8qOn9ZHj4TCqbGjxx96n6cazvQJHg5SVp3eCjMEYRysaJpmjbBkacHXjKMzlIbod8kncQifaGpcMjPkcJ85mc5xYvTvKRLgzso0ujx0vc0PQ2wNr3X3Iy2l9/bRhC6eKq5dCL1E7m5gb6ypwa45kiI/EM5BDkE7GccpiO3zYaMHATf8JLhCNFDuLHihcE/veltgPjgNzowNvBtVSdzAivXpDw/BYgXVKB/nFRIdkb+h3gVjvgD9o/3/3h2WhwaCnJRnAFqEyoTDBzUKIKFnWKHk4r9Pti2XBxpyvljE5kmhpcKqmGWaNOpXUup25H6nxW/RDWNS91FugqR21dBSLqRPXq4cvjro/M3DM8uqxNAyPa+8b4fMuayn8/NCVXbFVvHSI6cCA0CWwGL5RQxQwpdN4RWYVHM65MixT02TaSQD/5ye0/0vqnqFhbBhi2gnQxl4ySRgsXSyicUmlPIX9KRE0e+Mzej7K02M2TY14nRSMMF7BhGzDWLUq/o3hk/eMo68H7UK4ZlzSYU10BAaISudKmZmRMeBTP3zp6e5xk1/WiVkkVSARJCLSdNz7XbOuk/e/jtN2LvRXAqLuB39tz5vPS59PePNM33ZWdSfyWc6/u8cK7/P5BjWW3m3o//41lEN73a7zY4iiWdl9410iq07WaS5dsDH3DSYclV2sdJlaiTwud3Z3e/srAoftZ2FIdVIZECVo4OrhgDYnhcvXNgsp0Ia+eI2opzWMiVprBFVU3TNPOHgjUNeSE7N7DLcmXXbjKvBRoj72LfLyKW8R83mr8fCcJ62UfbNw1JpNvgD9t//OAHKs0MMnADk6p0agGjLkA43M75RkOZw95YbiGiJiLtbIlsyauRdzns1USLFRXIVnUxCc2G4JdacgjMIspx5Ht/YAfIGFIu7C3v/ZanU/3CRqCVxqL8g04VMvbvG7vq6QWfpVIlXBMcGT/ywWozT6o+TSsPGVRK9/QAuXdR9bGAZ9ysZ7K7HdYKAVhLOBC0idc85nWPGbtZ+KObBYu/YQKICzHpghp6ZoWBu0/JU4d+16yDSQxaNlDCDkeOZhtfaTI3IgD2OoRjlYZwwEDWSW5BKO7s7X1BdOvPyqLh2uGGaAK8/PTJ9Hfde++9L4r/HRdnX/LMGBnc7VImev+R7vOOxDKMOWXae2YFwF7xN6S6w43Upwe+Gr2fW5+NYpTxSU8kErftTOx8+TVfED8HLpVebCxmThp1eSw7l/5n6eKRdzykfealXb78aen5y63o1Nn+H7GdDK04zrYBYO38uDETbK9DALoJGAxP1Aww5vS7nwkhiLCCzqRzzZywH3nVkfEnP2guaoZySfhKdC8bm5dYZO2lJU87B6BklOSDso/q3so5bUr6snJR/M3eY723r8WM4UbJ9ZZC7WTn7L3/FeaiepTlE8T7CCxfkde60q11fG4tbbLsd5rmJocjQZH0ney74X2NKMs40Uk8XRaN3J3a/crkuf73ZGakXYWGMDdC8sE5UsGWtI+dt0GPoKMBSgMvthvaabuNBA6hCWJEOdDIGCmGIxQAEdzsXDqvTQ7+Z25WeX/yTPJ1nSycFdeLhIEDN+uledHzivPKviibplMq9noMvXVvEe5GthGKJ9AS+CUnN/VoBBpdq1bkQBCzu1ZdY/uBUuLblInkH2ZnhCcLC9LEaGjQebF9RCNFD4xj6XLfnuhaGxUAtqp37Nhxmz6dOlYlOg0zGm6KRuiKbrJdcJO+0UqTYaKRY6QYjoZFYtZVNzcvGupE8otWLXu3cln4mXv7H3xZlwek9XG7CUOHQj6VuvtEhyix9uTdFALgssgcK2FvErtW6OMTubFJXw788LHjz3a8KH164KcL80JPYWEgZTRSFPcYJ8Ww5Cs0J9JsptpFNx0aDvIic0Se7H/yujVRfk5ird4w4V4SgRlWAcvBwyoISvhFJ91GHB9pWSNEpfAkAJNKWw9z8+mJYk02jJr65eTZ5K+nTqduP0VOvXD5gydujXcF5RKPELHtKnWrmY7YQhsorXKDtwB7HQeNyTMImVVBnc1+OC7MXSad7+XLBEWcs7/uyPEjPyxdFD5mOVJfbn7gTLmpBtCEqEkAhBSuJ+vBxNrwRbkQ0Mxt4BTqVP/j1ywAS7V9hAMRO4aGOym65ghIv6YH/mYsxatDaqHTSF4agZigEigEAZOxME+QT294sp9bSI/qM+kvHBzb/zP3iYmVxZI7K2CoVj40iSq7bRlYexs8v85qu9ZVvca59g0RHrwLLA4V+Y5BOcB96hd36btWsZGpWx2LKvK/fVl+/Fulc8nfyk4L/wVACSxi8BpwAHI2PQBgEkLDPq9AygpjiR1IG3PBBUCfGXzoegQgyo1PfZlx1STa7ZP5vdGE058sLNmhMXcICp2XA4DGR7dQk/UGJEOBSiNyJVcNi4vSWXFi4HPCxMBbkELFXwZw7P5T/W8rzqm7zLo8C459uS2GTBDRZzDixFHa1NrW+VUn0L2yMHU/OHGTAlL0YIhj1BPRTbULzmDzDKliK7gfzxTZQHS1x98zsnxTZw/cnZsb1Ip1qT4WGGScmLQRBu2j6KXblqcg6geqGWVJ8Va7y541grNRns5wUIMxQ6ya+pnrFoDigvIpCECsuNO6odUuL5z2ATIdWjSZGk2It5ebGZKZlmT5nPCeB4zladcPZx9+bW5G+nylmZ2BIJRaFO/3WdLkWjl1N873t6+w33MbgQWcBFDAEVEMj5IsGUZhqIZ6Kjet/H3sfbJiU/2Jl/WfOPQb2el0yqrLLTzTKMmFqAtIC0s7iFiKKIAZXu0+VgFTlCeQbh8lOhHOHf6ra0Yl+YcOHd33x6zhI89nX6vR8zXso+wzFM613SS0QzhK8iGKRhXq4oh0Ubir5wEmCDyqJZ4TvyUzlfxcqaHWEA61vZQfby/3TAiARUvTgnmDMi+gYdGoo2+1JNoDsezpfn5BGZQvJt/zsLg8G0k8Jb42MyN8slBLX0CV0zGSDa0WIO1022pQ5k+nsHS3WEX8dxPb8PLGmlQAjAZILDly+Pie37kODcDLoSrvBLnA9pgArBSCbi9poxMAYYAhidBqlWghHiAzmxxRJyTKxV9WEuZM+tvNmrYf+EQVNXodEEmXp1axa3a/N3ZIXV9w1/tkBRyRlQNV74OpQ4kkzWwrO6/uks5LP4j4fXziHzce+fbCvP5Qyc0sHid5UgnSodEU/aIr+LDaYdyy716NMXS21i6xibWejWYx+zrJTUlvu+aQNPdfd2USry/WJKfcZr3+riYAG3fL4jZDxHalxI3B9kighfBvs7PS4aUESOP5/MUK5/rfY9X1M0iqKDVhHHHD6DpWt9f9/zqoH60/INBCDRUv52dnpCcHTg38AJ90fn8gsmamB++1HXHhBPIE2zKimGDwBKC6gehCuQq8i8oKRPOKwNMampjeW0MIkSSSX5TmHhr8wjfHBXGDGoB96Ld/u+eFZkM5NoKqnlEZtvW8pI1oAH4+iiHxA4mYlqv4ZhNRNoOUGpmF1JlDoDhRBhCPDzxmHPyGwk8GlyAAABqgSURBVIL01aMhEjFl2BY02zhei4+RQfj3rXFf7pXuLzK6okLQKGlTaWeCMWKSXE2S+8aXOn3we0pkEi/KzMh/UXK0GTS0qrY18PlQOpYZcVFGz7Lsn7WKQ6zjPa4SAEcIhuFt1eRSJ4/xWgN4nZSnOeEg7dcThUDXmuxVxsh1u1fLHtKvtBTqA2dnhIMHsrtpxcwhSvGO7IPzqQ8NeTl3NMzS4AxNmojn2F1JALwuB2cR0dJzNEeQFmkqufq0Npn+ILdN0OuQJ2UKRwd+tLAgFWE4l30VRFG/5MlBaQPaZqNaa7l2AncyT/KzwpfZvV0HMWSpzKtAEy6pD7rGZK8liTfeCINVjEzYCjHr8qknS7t/lK62ocRt3GA9MNL7ZruunUDOPWvRIq6vbr/XTQAgOGAhiUGlpfknSJkAFzl4IvHqmGtHV/3OnTtfoF5K//OQl2uh9qHtDbZpDeNnKFLJD8MRfCSp6BOp6+cldLJ4zwz+4gjr2BVV+uZGy5XdwtgB1y+8su2watWv+bIML90Gzl1q6PODZ/p+kQsqF9avqF95tV1XiydZISqaZ7d0LFe11lpuVPx76QtN+8Nhhgw1C15+UvtYTDvSwAx+f7yw/1tzs4Mi5fE3Yb+k/JKXpltZt+3latvlygW2Hi0AdpLhpsNyUyfqBZGmhl0XNSyW+/aqwoI8B599rYm80jbA/w01COiSuy7reahVLyvKuDEdxS+31HC4nfWl80ma9InJ6BFZIGq/vf/rclPJ3uNRfkE3AbCvJgBuqg3Wr7Wonk6eYAUhYwEt+mIHz+7/XyVHucBa4iSBbbA2NrTiB28GcfXJ6y4AG9oOaCa0UdNOcBf6ullBS82aFAHwIq3KvQ4B4H9HMWTLldyRdqYJSBmoIC3svI4HW7XVRAYiJrMIJlBTCartHJEv9P4GFwJuE9y+4/bbcrPykZOkGkUR1xAAb+0tbKkjaYnYi9nCbm03taZ5KJZPvnw59QdDzWww5KNNTBSppN3MkNyKFDFGTN3Ic6KMPve2NnqwTmx5kpmVnojm7vr5GR1IeEb8J1i0QJlYThqjTa9FulyCK4Ww0tawCmeE8/s/ZdZkBWpyKMiGhqMisSGw3VQskxaTTH3sta/bKZqQpucWG/BKxLDSUn1lLvXL/H75g9/Zc+cLs9PyIaYJWJIJo4iv4V45zOBjxRykNuoB6ZPCwZ6dPbSyFw/YLFUiUT41GhYIvttooNIXn8DoO+jzRF1EYhB5R/BpLh91eVkWMzWwFR8p5iVaVn4p52/dQuCmfWAj+oS4rkZc6xUA+sDqZfHN6PtD6+N7AF1QsTKWsLjsZpb8WsuRg+EwRwqLYvlx8eHX6peSv5CbE8qIBQy19ZAiYEvVw5fwgC72wPIHpn5vgMiY7WVrh44e+hF+z9xCvzeTeJHVyIlgDmNiUTFkTY3lYjKQDYRiUFWSn8s8ceeddz4vTozl7yI3p96PBBXkMCKRhLl265+oqKgDqz7iiD4EAIbbUd8IjYYyYjvKYrlJ3e51awK8w4oPoVLn5fPyjUsI5VvAXQ/0fI1Zzx1DpQwG30pXEQCuWmXk1genSJnYdb3y4fv/+uthmeoXBj5q1dSLWJ3lpuhTLj+NLCIVjAEk3WyClQfKysD3NWvy8YcidR1frY8aj36TuZAZpdW60b1jrRwAj6V0QTCz09JTdz3wwPPjgBj/qV4c/Dxq8gDQ4QzlKwpA5+9UI0bBIyEsOkrbaorhOIWPVWIuqunCvPxe21V3VdoZyjBaZrtcbQtxRFpUo1DTDt9wSjpXJfaisfMkJjKqx7uuSBpVfyiOhC4eBjEXtVzCSNAa/ntLe1+RmUntHGplArRTRd8/00uHRgS8rF/6kcufah9HOff5zKH4C1jKuD38hoqXm4QhG+tbROLeBXoZm4t68vYdO26jk97x89nzF2aVz56mlc0QrEHwhzeKuoKx1tlyovQ0WiMYvQGLpOoV2vkZOQG+I66vTaa/QFFNT2ULrIsAsOutWGyu4gOcyk4pvxm/5xslAPRFKKeFt5QcLeLl0wZJV5j01S/CdFRabMlYTA28s+cuaqViDJ7u/ZnivDqCljJwo0zqP8NzWK9KRfcO7Luw2i1SmM7+SfwlcHdNOJN877CPTFsYWksJJPBOQHErOYXh3dkHeVuWW+Kflc4P/CEQSeyzbPKXY/fdFwDi9FQAEDegQFK1WWhnZgeeODjW+yZc+6677np+djr1X2A+oWweagJcGbji8YGoG5krBrAdTEc790DygetqkHG1sd1uaMYY8uRo+lX3h16OvvEHSUXVO8tEn04duOOuO57PX/RnnvrMSzPT0v2Ihw+1NeoyLt8Gur9wVn5eIUZDCcttmVTd/GLv8FM/GJ/IjjE7mbqH8gsjLWaCx9dWSdnLTPWe6P2+uO/MP3Nk/OAvV52sX/bkENlBK3kPq7e9JY0AQTOdFI1rjAUFkp2TBpJnk3Ti6XedSHytMScPYusx3cGoPlDEdO4CES+9Y761gIFkEsvLfuFpqwXAIUV9Sv5zqHLanaPLzXVHuFjrNMtR2gxVE3m+P006we/q+fSvVdzsHFQkSr11vI0VaN5qDyHSMg3UBCqQwkJ6cNlKiPDwO+646/mlelYZIxopOCnfdjPBWJAn2vn+964oAEEF5+DYwe+utJSpoYAZtFE8YI06vohlsHhGRwgc2S81kdZtE6uhHM9Mp34lfu371ce+3qrrAgOtxFaHcLOemEqU9mYgVZxqAS2Uz6Y6RvANFwC+Hx4+evh1tptZjLpir2mlrrSul/6PN3umv7do6dU5JrUMT4+QNfPxNxTmpRxViR7AlVQErqjdBSD2/dAeIJnkplhRBy5c/MXst/f/gOWoNcMbDCDMhRn9C/EV3zF8e3q+xpjXtGOo6duAsIClA99+CQlduh9qgTPKHHoaeygtkyfVZtbNzQmffDT3KHUnecDo/r33v6Iwq+docSzqorJg07rh4UjoUcgKoXNjXuHtcrc//TX/Z5RHmBpdztRdSwCW/4zVvaeTCn+7QvRLUVsXxpOj35EQ73tJflbZA7ug0qK5/MuE7SoCEAAuth29srKpA1/hmWn545cBEtXTxbvvuefF8XM6PY9nxXvx/ZigJQGMKGCr0EoAP/BgkoHdSvmY2PyCYg2e6o1Ky/bcgrgFfkeDqeK8ajF8Itlm11wNTXd7t/FtBv2TEZZWL0lRLsLTmBXMV1BxIvOWiptl7VLX0ALdHyCuAVguvu1J/ggKMEyKH+QTFMsd2J6dVv71GA31wvgaWJ9fzLYNWlI9O6X8YXTvy0q8Ir/fXFC1/GzynfF9v5OJdOHIz5WbCkgfYC3F9v1uEwR0csBHo6qKl/fVS/I/IT2LfzcXvEfLj35LcU4rw++nghVlN60FTl1ZEKhxybqW1TX0L3hmagEsJWtIe2guPFKy12mtLwkAb54I9ooYWi0lHGoW/NSpgXfwFxaHXMWz/X8O67nSBG1qfTApABqGixfsO+9c1TKG/tw1sPcVQ0NDdJLi/w8OvlETS+BAoPYP5Re4Aim5aUYFW4VRABhjvQmsevZC8kzyZ+OoJBeqL+Ye/Rajpo2AzoYi1HFXt1MXcKUAuFcT8iLJz2Se/tXPB18pmYvCnZWmjj0PlCbqUsVBj7UnJm7ZMiMGcGjBE4OKnwG7Zko639ux3pGgwu0C7bLyZ0d9gEYwxKLtgAZb1v4+6tu7YjAKYGdS+t/03mMviDN3yDJqdvRs06kexNSLjSQzdDuwt9AJ8jCVDxq2GNpNGLUllK4RHskkaFEmKrxkW6dvQGLoK68uLEpDAKNQ9Gppz+eTvdquWDnh8frBsPwpB7GRx+p/ZgffCqwFbT+FWN0kq3FLVzaHgdenFRj2TieLGjOlRvbEUoGFnlW+OPD3UhPlWKGWUWo90ixrqEi0ZDlOcqQwJ6/ZQZTEJp8jfch3LHn6YrmFJo/4jpV2RlSnD/2OvHRgtVQfHAV9QkAfgVuWu5HR5JsHXl+oqaMoAGmAOdxcpj3WafTFXD/KKEoG1SBL1PPqu57xMnAdF6m6902lhtYs0UlPM0udRdLWN/kRi5U1VEYhKAA5JinUM4O39zA0jtsCnS5ek/LfwXgqoT0c95e7aBxw9Cm/vpGZ6LV6aar01VLRCvPaI2gJZzrwPpbausYPWtTaSwblthwMtQpEuiDwMrSdglVcCB7JPPIqs54ZBoiElDqWwbOBAA+d/LhmRT5GygduYNdyPPfvma8FxKU7OyV9gdX1g0Gzug/uFUkPPMGhobCD1ucDHl8i+rT0YPx74kJQmNc+yxpRwzq/EumChmT9MWKT9Nnkr0cva9VK6YlWf+p03w8ZdbFptVBWLorrxyjYHdjYFXxU/R5GvtL5QdoGZkXWLr3efeK/fqNRk0q0t3Aj2ba8VKTtNiYAPILJK6OUWhIqg9elsxJtHfdM1WlYNvjDoidwqZa9ONQGxi6FbG9bscqvAmiwKl2snSp9SVF1z8yU8Acr/XOuEcz5zCG4oqCJsa1nre2Fpkr5Y8RCK5rHu6nKRPS34qL6Zax+RARZ5tFqDWA00kHFz5Kym6/rk3pUim2JdsVX/s7enS/PLwgmrX8MVw9aEUJE70nasAZYEgA0kq6Qwrz26W7P84wNPjHpU/0fhlpGXiBNT1qFZl1pn4vO6VjXKH2O1vIqqTR1Z0/1q2+Jv1gOSO3s/dLLbSdTRQMG5Mot3ytjAuCJQRWdu+v6yZX+fnz1Hxg78H22o7l2G2FaxAlg6NEXvqQFGkIA0mnZy04fHOPVuJcmn6/8x4wHviE/myowxFRg1r7DySy0Pc7GBCDiSVi06inIubnqztzO/3Ez1QG81ZjVkqjKTVO26MtbH6LV7RzAqEg9txry8d3ZA69cC6jZWz30/SVXXUCBaVqfj0XFGGDDrXQP3bplYiwKrd35R75nZc4+4Q2oF1P3MFQuinSyIAvzVDwBsHGAiqHlRn7h0FHWJj5e/pVfE/CusajotM080t/i+31MMDciACU6+WAdSWG5qQXC2ZuoXyB/8H3VfW+ouplZdLKi7dU3wGnvRieDb03RsnomMnaWJo6/fH0y/buIANo0dY27aZxRA3WbitrQFElhlvf7Ww75fmHfF/6nUZfOopsntfw7Bhc7DC8ZVHwV0cKFPdU9b1s5+fy+/n3/w19XnM8oVJCoqwdvYYMGX5etDJQzxE+Kc1qnVO62m2V0SqdOiB+m1ikCRVGsfSOTv4KTR1OeWdv0PMlMpT60kubcQSYX9CcoXQ14PV1p0XYS8fIMR26DipaZTt0Tn7wER/1OD/wqwsEIq66MYEIgUIOw4mZ9sKPjn49vSWgGWWroAydi8O56SKFXP9DzSKI+v11XpR09PQy4epZK9227areNBe0xeAVmA/UBNpwfGEPA8FMhaP9qt1LorVcbPD74w2vZAw+mHnxlqZE7AUiZ1geO8e4Y2ggNUCDypd7d8Xsl0c/CvPJUVH9oGaoJo9b0lGAkNEn6VH+HfRx7ZjoJIJBkpqRDJxGSpfWHWXHqpSqk17LnR5g/LTuTB0h2cV/18VUta26awV/GQ9pTLy3VM0VKp0Y491oFgKaGwS1M0RZwYLuUHL24s3fnC5YFdyKNkJvWfxVcAptWE2UuZqmzDagMM28oA536A9FLlC/J32Y2ZFqTmBE9ovuB9nHlNoo/ps8lP77W5HcIotMiJXPQotN88mI8gY0LABdAAYWngpF2kcgXhF9i33sT7PvdBn8hT9qPfI9dVyeHQzQvSEVVPTaYnUMnABU3UmC6RBwCtJmXPhl9160rv7dUy+7DRLAK4zCeWPDGdBUfzSRzc+kijwPwyZQnk++lvQppvQHGNmaBFrhbNsnPa7TU2vISNkuTX5hVv8j2fKS4R1S2GFljQwJAGz/gGmisLYYlT6PdTtLn+j5+0+373QaX0MPVp95WcbU6jEKo5fIGBYBTzzsETgSN0HatqaKz6M/G93C+mvsrB7+74nCvQA6B48OCRjYvytNoUwMj27Zte35ccygT/f8BKjUsdsrUZe3dKNJWmBWFnp6elR1HaSEn/JKfkz/HaFwpOvnXa+zxaKPZTOIeaEHs/IyyjKuwKQZfXQPHB95X9fJhuYnaujKNqq3/ZcS3BfZvgDAorGDW1ep9Im/g3EHfop6/Aq1ogmpdLEEURqAQVEmWoBnU29/+EV7KdRuEoOToQxWUfHdS6DPImi6FEmISF7+UfOx13RpF5aaUfwShBQRRWkS6C2y8kRI0S0ih0oLRWpyXQHDlDKWby+i72uArTDx/5EM0atXSfPDvVqrErjDxWl4Cq8jRBpU6Ny1+egXbpxPitevZC9UAdHEUrWICMAQBmBeOvv7tb+8IwOGhw99YXEwtmi0REx+iU5npSkGlrRPp/MC7VnodHXLpuYMfRRjWprxFFIpgaGbX+14nHoLIqOGJLSCcpVpmYNfArlXA1aYa/IWpEwN/NOyjDpBK8/fjPXLXqw34ajLgp7cQl9cbCTNxx1rEz/ys/tfULQRXoSMAOZKZHqxiRfEXeri6/8ctB+pWCAsNMSw2EGK1SG5W+Zf49eizRHmHvcee+tWKp1Gtht4F3VLOribgq59RDMGahlYpzosKZ/felBb/NcHFZ478VqWpe+huCc7e2i9CvIoAMCOr6KAHb54U50QpXqqWT+yXer/0crOmnR0K0bolHSD7Zph2D03l4veUuSx+6BiKYDqiX2ioPho/Fuqicsdddz0/7mt32MHDA+8oNZRmpRURWVawn7uu+Ku4goxiD6DHJPk58fDO3g7Mu7knf6UmSJ878tN2XZ9lzRbQnwd+Njj9gFux/3X2wCgzaOXLZLl7KMZYdJAHZxH1ksDbsC6jcluLhY/TEKyT9osNxQdH0KypA3FiZnFeuQd9CfOu0DKb+E7NRURwLYrYk+bu70MfvmH0JXbEgDF4eSua5St++b+jbCCae8iAIS7MVOUjP9JT28ic0iYGHtt2551UQ236lb9y8InZX97/RmsxWzlFY/opVBgNwKaFEYWJjcghq0ilcSGAoMBoAyHCrOnHExlWjpbXF8Tvfaf6XltoSHNWS0JDato9VLnc+1+8sgh+mnV19xgEwEl6CLKo0+In4vfaie0biVebNe0YNUC7aq9uArDUAjZeWo61lE/6FV8KRnyDKJdT2HZotHPT9vq52uAG267SrhdnppSH4WqN+KgbgCpfSmg6StR3Dy3XWVbtavp1lGYFbdEQKPvWXtT+di0tkJlJfZlF5EQPRZrky32fjwtAoSYeGSYyGUJKWV2Rt0WFKqNrUPX/mYc+89JSXcqzjlxIZF1KB1s18WsKwBKTiOc3AHBihS5ypOJlF9WpdIersGkNvvWOeLXw1Im+36+4mekToHCznsE0Dg8QZ2V28PL9lQmB2UiGZR9UbX0KreZwTayeTkfvcwPvoFXNPaEFKNhYUHktf0YxmzqsDRGFlN1MSz6b/smO6qdcRLoKt+fnpCeQc2i7Ay3GBeQr+gqRzDX/HgmAK/nlpuxTwKqRMWLVxTpA03N+8KrY+L1/fP+3KpcG9gLGHSO5EAUkDFdZlha2yq+mbd3YC0WhakT6sjPSv8XJmPj99tt33GbUpSr6+KEk28CxfT8fnYPJvVWe6rNOkxKIJw/g71xwOsyjReQFAN+nVU07/IAOv2GD1TvAW4BdUmnm2+mLA59G6vpND+8+nSPOZkGkrbAgVzCZo7SABHth1FCkBlOa1SRGHiCYNVFLtyJCz21sB+rc4eHDr4n3OMLvmZnkP1FjsKHUE4VHv6vz3YnEbVZTOW576gL2+JWfGzh++HdGQuToJ32zoYa0GLObYuXr6O/x+siRUMRL10b7PVxFJK0O+3pAXbxFzRo4fYSSXChl/GaI6T+bAyqbG1s9D/e8MH267/256VT1aIiWrtnQ8lA9Q2ijWUWR8vEoVMurYlNhKDbAj8+T3HT6s1yw+IuVz8s/jjiA7Slneo/lqHuFgYyhQiM9XViQeAPKzmf6xvf/VMXTnVILCadC1LR5BTGUF8pa5grGchRps+d0u+zLAfB801EvZ6a1j/CmUv8t9vuNjPgL6UkkblMu9b7PXJSyJUennPuhMEsBG8T2ER9nAiGE6O+bd+TQaunEdvLze8yOFuCW9K3FReGs5WjZuNYZOD7wCrOmZw+cYDUHO26fkXh1yVHPDRGVehrdkL1lNPEoiMQ6h6MyerJdaSsh5QY0couZSe2zsbLxy1rdbo1lUsASKeIrI3ki+abMZPrT+lz/kN0SCCBYWM9lXyIFdyAsev3tvDfYznmDHkrZyZfSf81e9FKnzeyM/GR2UrkvmgCq4o1J+ZsylzIU7u1MSE/PLcailkQou+igHzCrBL7yiAsAI66wgs9GM+0PBWrIAkSZKX1K+vc9lT08nrDq2bbGFcbKl4XtoffEwbdqU/2fys2l+goLwkVEBuG/j4UFMkqytM06Eks4+bMTjzgrvk84LbwnrgFoAyaxkwpO/6ZNCP8IehnrgIKOKAybWHlEtXtQHwEVvn0UwjpKiiGEs1iTjykTqU/Gu4duTfx1DNqjkHLul7tI9ybufVnyTO9bhYvCbwsXBj+pTaWfNGpyzqppp4+MHPi5+GSLE+JLxFPisjY1fHJIB6ru21Fua6Tg9gUFWgKeV/CisC81NtEZHPYI0rIqbYUcI0Z4NKT7ey0/L+9VL6bfPXBpoBPAebpa6f23HCvapnV9qSjUnDjL3KurXpOw6/SNiq+1veylki+TgpMMQEPDZFMY2eMNsoSwQqBxciEIJEZdrhUW5JR6Wbhrt8kKU8WuuzXxT/fgHbJjTZS7CkWXfXc7/6VYUw7CUyg6g56BdPCmQNDrCEQRIIloYlFsKM18TR7OLohfNWvae/eYX33NikAUb9m6tcc/a4PV8qOZQ1c9NRIYYyH3yQlyjIyHOR+UM0QrjZriFhbk05lp4Uh+Rvo3+VLq9w5XD79hZeHlbh2/tsZNPuKtcfXLmfsHzx55QJ1I/0NxNvORweO9P5MYOvD6R3tZSZeVA3YFrUv8XA3Y/Dcb26/0n7EVzvf0rZX+XBskmmRech4rPGrMvDXZW2NrbI3n+Pj/NQqWrW7WvUcAAAAASUVORK5CYII=" width="48" height="48"/></svg>`;
  const CSS = `
    :host { all: initial !important; display: block !important; max-width: 100% !important;
      margin: 5px 0 7px !important; container-type: inline-size !important;  }
    .badge { --tone: var(--pawmark-text-secondary); box-sizing: border-box; display: inline-flex; align-items: center;
      gap: 8px; max-width: 100%; min-height: 38px; padding: 5px 8px;
      border: 1px solid transparent; border-left: 3px solid var(--tone); border-radius: 0;
      background: var(--pawmark-surface); color: var(--pawmark-text); text-decoration: none;
      font: 500 12px/1.3 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      letter-spacing: 0; text-align: left; direction: ltr; vertical-align: top;
      transition: transform 140ms ease, opacity 140ms ease; }
    .badge[data-tone="pawmarked"] { --tone: var(--pawmark-status-positive); }
    .badge[data-tone="good"] { --tone: var(--pawmark-good); }
    .badge[data-tone="mixed"] { --tone: var(--pawmark-warning); }
    .badge[data-tone="poor"] { --tone: var(--pawmark-poor); }
    .badge[data-tone="avoid"] { --tone: var(--pawmark-danger); }
    .badge[data-state="product"] { display: inline-grid; grid-template-columns: 20px auto minmax(0,1fr); gap: 3px 8px; }
    .badge[data-state="none"] { background: var(--pawmark-surface); border-color: transparent; color: var(--pawmark-text-secondary); }
    .badge:not([data-state="product"]) { border-left-width: 1px; gap: 5px; }
    .mark { display: flex; flex: 0 0 20px; color: var(--pawmark-accent); }
    .mark svg { display: block; width: 20px; height: 20px; }
    .score { color: var(--tone); flex: 0 0 auto; font-size: 22px; line-height: 26px; font-weight: 750;
      font-variant-numeric: tabular-nums; }
    .copy { display: flex; flex-direction: column; min-width: 0; overflow-wrap: anywhere; }
    .brand { font-family: var(--pawmark-font-brand, Georgia); font-size: 10px; line-height: 13px; font-weight: 700; color: var(--pawmark-text-secondary); }
    .status { font-size: 12px; line-height: 15px; }
    .badge[data-state="product"] .status { color: var(--tone); font-weight: 650; }
    .traits { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 2px 10px; min-width: 0; padding-top: 2px; }
    .trait { display: inline-flex; align-items: center; gap: 3px; max-width: 100%;
      font-size: 11px; line-height: 15px; font-weight: 500; color: var(--pawmark-text-secondary); }
    .trait svg { width: 12px; height: 12px; flex: 0 0 12px; }
    .trait[data-tone="positive"] { color: var(--pawmark-status-positive); }
    .trait[data-tone="negative"] { color: var(--pawmark-status-negative); }
    .trait[data-tone="caution"] { color: var(--pawmark-status-caution); }
    .trait[data-tone="neutral"] { color: var(--pawmark-status-neutral); }
    @container (max-width: 155px) {
      .badge[data-state="product"] { grid-template-columns: 16px auto minmax(0,1fr); gap: 3px 5px; padding: 4px 6px; }
      .traits { padding-top: 2px; gap: 2px 6px; }
      .trait svg { display: none; }
      [data-state="product"] .mark svg { width: 16px; height: 16px; }
      [data-state="product"] .brand { display: none; }
      [data-state="product"] .status { font-size: 11px; }
    }
    .badge[href]:hover { background: var(--pawmark-secondary); border-color: var(--pawmark-border-subtle); border-left-color: var(--tone); }
    .badge[href]:focus-visible { outline: 2px solid var(--pawmark-accent); outline-offset: 2px; }
    .badge[data-state="bundle"][href] .status { text-decoration: underline; text-underline-offset: 3px; }
    .navigation { display: flex; flex: 0 0 14px; transform: rotate(-90deg); }.navigation svg { width: 14px; height: 14px; }
    @media (prefers-reduced-motion: reduce) { .badge { transition: none; } }
    @media (forced-colors: active) { .badge[data-tone] { --tone: CanvasText; }.badge { border-color: CanvasText; color: CanvasText; }
      .brand, .mark, .trait[data-tone] { color: CanvasText; } .badge[href]:focus-visible { outline-color: Highlight; } }
  `;

  const VEGAN = Object.freeze({
    vegan: ['Yes', 'positive'], non_vegan: ['No', 'negative'],
    unclear: ['Unclear', 'caution'], unknown: ['Unknown', 'neutral'],
  });
  
  const CRUELTY_FREE = Object.freeze({
    confirmed: ['Yes', 'positive'], not_cruelty_free: ['No', 'negative'],
    unclear: ['Unclear', 'caution'], unknown: ['Unknown', 'neutral'],
  });
  function productTrait(name, value, labels, heading) {
    const [status, tone] = typeof value === 'string' && Object.hasOwn(labels, value) ? labels[value] : labels.unknown;
    const label = `${heading}: ${status}`;
    return { name, label, tone, description: label };
  }

  function productUrl(slug) {
    if (typeof slug !== "string" || !/^[a-zA-Z0-9_-]{1,200}$/.test(slug)) return null;
    try {
      const base = new URL(scope.PawmarkConfig.PAWMARK_BASE_URL);
      const url = new URL(scope.PawmarkConfig.getPawmarkUrl(`/product/${encodeURIComponent(slug)}`));
      return ["http:", "https:"].includes(url.protocol) && url.origin === base.origin && !url.username && !url.password ? url.href : null;
    } catch { return null; }
  }
  function presentation(entry) {
    const result = entry?.matchResult;
    if (entry?.matchState !== "resolved" || !result || result.clientKey !== entry.key) return null;
    if (result.state === "product") {
      const product = result.product;
      if (!product?.id || typeof product.score !== "number" || !Number.isFinite(product.score) || product.score < 0 || product.score > 100) return null;
      const tone = scope.PawmarkUI.getScoreTone(product.score);
      if (product.status !== tone.status) return null;
      const traits = [productTrait('vegan', product.veganStatus, VEGAN, 'Vegan'),
        productTrait('cruelty-free', product.crueltyFreeStatus, CRUELTY_FREE, 'Cruelty-free')];
      return { state: "product", score: String(product.score), tone: tone.key, label: scope.PawmarkUI.getScoreLabel(tone.status),
        traits, description: `Kindness Meter score: ${product.score}/100 - ${globalThis.PawmarkUI.getScoreLabel(tone.status)}. ${traits.map(trait => trait.description).join('. ')}.`, href: productUrl(product.slug) };
    }
    const neutral = {
      brand: ["Brand recognized", "Kindvue recognizes the brand, but this exact product has not been rated."],
      none: ["Not checked yet", "We don't have enough product-level evidence yet."],
      bundle: ["Multiple products", "Multiple products detected. No combined Kindness Meter score."],
    }[result.state];
    if (!neutral) return null;
    const model = { state: result.state, label: neutral[0], description: neutral[1], tone: "neutral" };
    if (result.state === 'bundle') {
      const identity = entry.identity;
      try {
        const url = new URL(identity?.productUrl);
        const target = scope.PawmarkAmazonCards?.productTarget(url.href);
        if (url.protocol === 'https:' && target?.asin && target.asin === identity.retailerProductId
          && entry.key === `amazon_in:asin:${target.asin}`) model.href = target.url;
      } catch {  }
    }
    return model;
  }
  function currentBundleIdentity(entry) {
    const current = scope.PawmarkAmazonCards.extract(entry.element, entry.element.ownerDocument.defaultView.location.href);
    return current && ['retailerProductId', 'productUrl', 'title', 'brand'].every(key => current[key] === entry.identity[key]);
  }
  function placement(entry) {
    const card = entry.element;
    const heading = scope.PawmarkAmazonCards.findTitleHeading(card, entry.identity);
    if (!heading) return null;
    let anchor = heading;
    
    const link = heading.closest('a, button, [role="link"], [role="button"]');
    if (link) anchor = link;
    if (anchor === card || !card.contains(anchor) || !anchor.parentElement || anchor.parentElement.closest('a, button, [role="link"], [role="button"]')) return null;
    return anchor;
  }
  function createRenderer({ enabled = false } = {}) {
    const records = new Map(), owners = new WeakMap();
    function remove(card) {
      const record = records.get(card);
      records.delete(card);
      record?.host.remove();
    }
    function render(entry) {
      if (!enabled) return;
      const card = entry.element, model = presentation(entry);
      if (!card.isConnected || !model) { remove(card); return; }
      if (model.state === 'bundle' && model.href && !currentBundleIdentity(entry)) { remove(card); return; }
      const existing = records.get(card), signature = JSON.stringify(model);
      if (existing?.host.isConnected && card.contains(existing.host) && existing.anchor.nextSibling === existing.host && existing.identity === entry.identity && existing.signature === signature) return;
      remove(card);
      const anchor = placement(entry);
      if (!anchor) return;
      
      for (const leftover of card.querySelectorAll(`[${MARKER}]`)) {
        owners.set(leftover, card); leftover.remove();
      }
      const doc = card.ownerDocument, host = doc.createElement("pawmark-shopping-badge");
      host.setAttribute(MARKER, "badge");
      host.setAttribute("data-pawmark-client-key", entry.key);
      const shadow = host.attachShadow({ mode: "open" });
      scope.PawmarkTheme?.mount(host);
      const style = doc.createElement("style"); style.textContent = CSS;
      const badge = doc.createElement(model.href ? "a" : "span");
      badge.className = "badge"; badge.dataset.state = model.state; badge.dataset.tone = model.tone;
      badge.title = model.description;
      const navigation = model.state === 'bundle' ? ' Open Amazon product page for the Kindvue component breakdown.' : ' Open Kindvue product in a new tab.';
      badge.setAttribute("aria-label", model.description + (model.href ? navigation : ""));
      if (model.href) {
        badge.href = model.href; badge.rel = "noopener noreferrer";
        if (model.state !== 'bundle') badge.target = "_blank";
        else badge.title = 'View Kindvue breakdown on Amazon';
        
        for (const type of ["click", "auxclick", "keydown", "keyup"]) badge.addEventListener(type, event => {
          event.stopPropagation();
          
          if (model.state === 'bundle' && !currentBundleIdentity(entry)) { event.preventDefault(); badge.removeAttribute('href'); remove(card); }
        });
      }
      const mark = doc.createElement("span"); mark.className = "mark"; mark.innerHTML = MARK;
      badge.append(mark);
      if (model.score !== undefined) {
        const score = doc.createElement("strong"); score.className = "score"; score.textContent = model.score; badge.append(score);
      }
      const copy = doc.createElement("span"); copy.className = "copy";
      const brand = doc.createElement("span"); brand.className = "brand"; brand.textContent = "Kindvue";
      const label = doc.createElement("span"); label.className = "status"; label.textContent = model.label;
      copy.append(brand, label); badge.append(copy);
      if (model.state === 'bundle' && model.href) {
        const navigation = doc.createElement('span'); navigation.className = 'navigation';
        navigation.setAttribute('aria-hidden', 'true'); navigation.innerHTML = scope.PawmarkSaveIcons.chevron;
        badge.append(navigation);
      }
      if (model.traits) {
        const traits = doc.createElement('span'); traits.className = 'traits';
        for (const trait of model.traits) {
          const item = doc.createElement('span'); item.className = 'trait'; item.dataset.tone = trait.tone;
          item.dataset.concept = trait.name; item.title = trait.description; item.setAttribute('aria-label', trait.description);
          item.innerHTML = scope.PawmarkUI.getConceptIcon(trait.name);
          const text = doc.createElement('span'); text.textContent = trait.label; item.append(text); traits.append(item);
        }
        badge.append(traits);
      }
      shadow.append(style, badge);
      records.set(card, { host, anchor, identity: entry.identity, signature }); owners.set(host, card);
      anchor.after(host);
    }
    return Object.freeze({
      onPresentation: ({ type, entry }) => type === "validated" ? render(entry) : remove(entry.element),
      isOwnMutation: mutation => {
        if (owners.has(mutation.target)) return true;
        if (mutation.type !== "childList") return false;
        const nodes = [...mutation.addedNodes, ...mutation.removedNodes];
        return nodes.length > 0 && nodes.every(node => {
          if (!owners.has(node)) return false;
          const card = owners.get(node), record = records.get(card);
          return record?.host !== node || card.contains(node) && record.anchor.nextSibling === node;
        });
      },
      clear: () => { for (const card of records.keys()) remove(card); },
    });
  }
  scope.PawmarkShoppingBadges = Object.freeze({ createRenderer, presentation, getBrandMark: () => MARK });
})(globalThis);
